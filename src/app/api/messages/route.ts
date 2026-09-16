import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { clientCheckIns, coachingRelationships, members, messages } from "@/db/schema";
import { assertMemberAccess } from "@/lib/access";
import { apiError, apiOk, centreIdForSession, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.MESSAGE_CLIENT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const memberId = new URL(request.url).searchParams.get("memberId");

  if (session.activeRole === "client") {
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.userId, session.userId))
      .limit(1);
    if (!member) return apiOk({ messages: [], checkIns: [] });

    const msgs = await db
      .select()
      .from(messages)
      .where(and(eq(messages.memberId, member.id), eq(messages.hidden, false)))
      .orderBy(desc(messages.createdAt))
      .limit(50);

    return apiOk({ messages: msgs, checkIns: [] });
  }

  if (!memberId) return apiError("memberId required", 400);

  try {
    await assertMemberAccess(session, memberId);
  } catch {
    return apiError("Not found", 404);
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(and(eq(messages.memberId, memberId), eq(messages.hidden, false)))
    .orderBy(desc(messages.createdAt))
    .limit(50);

  const checkIns = await db
    .select()
    .from(clientCheckIns)
    .where(eq(clientCheckIns.memberId, memberId))
    .orderBy(desc(clientCheckIns.createdAt))
    .limit(10);

  return apiOk({ messages: msgs, checkIns });
}

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.MESSAGE_CLIENT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = z
    .object({
      memberId: z.string().uuid().optional(),
      body: z.string().min(1).optional(),
      checkIn: z
        .object({
          sleep: z.string().optional(),
          energy: z.string().optional(),
          nutritionAdherence: z.string().optional(),
          trainingAdherence: z.string().optional(),
          painDiscomfort: z.string().optional(),
          clientComment: z.string().optional(),
        })
        .optional(),
      trainerResponse: z.string().optional(),
      checkInId: z.string().uuid().optional(),
    })
    .parse(await request.json());

  let memberId = body.memberId;
  let trainerId = session.userId;

  if (session.activeRole === "client") {
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.userId, session.userId))
      .limit(1);
    if (!member) return apiError("Member not found", 404);
    memberId = member.id;

    const [rel] = await db
      .select()
      .from(coachingRelationships)
      .where(eq(coachingRelationships.memberId, member.id))
      .limit(1);
    if (!rel) return apiError("No trainer assigned", 400);
    trainerId = rel.trainerId;

    if (body.checkIn) {
      const [row] = await db
        .insert(clientCheckIns)
        .values({
          organisationId: session.organisationId,
          memberId: member.id,
          trainerId,
          ...body.checkIn,
        })
        .returning();
      await writeAudit(session, "check_in.created", "check_in", row.id);
      return apiOk({ checkIn: row });
    }

    if (!body.body) return apiError("Message body required", 400);

    const [msg] = await db
      .insert(messages)
      .values({
        organisationId: session.organisationId,
        memberId: member.id,
        trainerId,
        senderId: session.userId,
        body: body.body,
      })
      .returning();
    return apiOk({ message: msg });
  }

  if (!memberId) return apiError("memberId required", 400);

  try {
    await assertMemberAccess(session, memberId);
  } catch {
    return apiError("Not found", 404);
  }

  if (body.checkInId && body.trainerResponse) {
    await db
      .update(clientCheckIns)
      .set({ trainerResponse: body.trainerResponse })
      .where(eq(clientCheckIns.id, body.checkInId));
    return apiOk({});
  }

  if (!body.body) return apiError("Message body required", 400);

  const [msg] = await db
    .insert(messages)
    .values({
      organisationId: session.organisationId,
      memberId,
      trainerId: session.userId,
      senderId: session.userId,
      body: body.body,
    })
    .returning();

  await writeAudit(session, "message.sent", "message", msg.id);
  return apiOk({ message: msg });
}
