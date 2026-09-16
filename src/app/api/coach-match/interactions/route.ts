import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { coachMatchInteractions, members } from "@/db/schema";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { PERMISSIONS } from "@/lib/permissions";

const bodySchema = z.object({
  trainerId: z.string().uuid(),
  centreId: z.string().uuid(),
  status: z.enum(["saved", "passed"]),
  matchScore: z.number().int().min(0).max(100).optional(),
  matchReasons: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.COACH_MATCH);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = bodySchema.parse(await request.json());

  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.userId, session.userId))
    .limit(1);

  if (!member) return apiError("Member profile required", 400);

  const [existing] = await db
    .select()
    .from(coachMatchInteractions)
    .where(
      and(
        eq(coachMatchInteractions.memberId, member.id),
        eq(coachMatchInteractions.trainerId, body.trainerId),
      ),
    )
    .limit(1);

  if (existing?.status === "requested" || existing?.status === "matched") {
    return apiError("Cannot change a coach you have already requested or matched", 400);
  }

  const now = new Date();
  const values = {
    organisationId: session.organisationId,
    centreId: body.centreId,
    memberId: member.id,
    trainerId: body.trainerId,
    status: body.status as "saved" | "passed",
    matchScore: body.matchScore ?? null,
    matchReasons: body.matchReasons ?? [],
    updatedAt: now,
  };

  let interaction;
  if (existing) {
    [interaction] = await db
      .update(coachMatchInteractions)
      .set(values)
      .where(eq(coachMatchInteractions.id, existing.id))
      .returning();
  } else {
    [interaction] = await db.insert(coachMatchInteractions).values(values).returning();
  }

  return apiOk({ interaction });
}
