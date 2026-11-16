import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { coachNotes, coachingRelationships, members, sessions } from "@/db/schema";
import { assertMemberAccess, assertSessionAccess } from "@/lib/access";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { closeSession } from "@/lib/domain/session-service";
import { PERMISSIONS } from "@/lib/permissions";

const PERFORMANCE_RPE: Record<string, number> = { Great: 8, Good: 7, Average: 6, Regressed: 4 };

const bodySchema = z
  .object({
    sessionId: z.string().uuid().optional(),
    memberId: z.string().uuid().optional(),
    performance: z.enum(["Great", "Good", "Average", "Regressed"]),
    energy: z.enum(["Low", "Okay", "Good", "Excellent"]).default("Good"),
    rpe: z.number().int().min(1).max(10).optional(),
    pain: z.string().trim().max(500).optional(),
    nextNote: z.string().trim().max(1000).optional(),
  })
  .refine((b) => b.sessionId || b.memberId, { message: "Pick a session or client" });

function dayBounds(d = new Date()) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

async function resolveSessionId(
  session: { userId: string; organisationId: string },
  memberId: string,
): Promise<string> {
  const { start, end } = dayBounds();
  const open = ["scheduled", "in_progress"] as const;

  const [today] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.memberId, memberId),
        eq(sessions.trainerId, session.userId),
        inArray(sessions.status, [...open]),
        gte(sessions.scheduledAt, start),
        lt(sessions.scheduledAt, end),
      ),
    )
    .orderBy(asc(sessions.scheduledAt))
    .limit(1);
  if (today) return today.id;

  const [overdue] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.memberId, memberId),
        eq(sessions.trainerId, session.userId),
        inArray(sessions.status, [...open]),
        lt(sessions.scheduledAt, start),
      ),
    )
    .orderBy(desc(sessions.scheduledAt))
    .limit(1);
  if (overdue) return overdue.id;

  const [member] = await db
    .select({ centreId: members.centreId })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);
  const [created] = await db
    .insert(sessions)
    .values({
      organisationId: session.organisationId,
      centreId: member.centreId,
      memberId,
      trainerId: session.userId,
      kind: "pt",
      status: "scheduled",
      scheduledAt: new Date(),
    })
    .returning({ id: sessions.id });
  return created.id;
}

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.SESSION_LOG);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (err) {
    return apiError(err instanceof z.ZodError ? err.issues.map((i) => i.message).join("; ") : "Invalid request", 400);
  }

  let sessionId = body.sessionId;
  try {
    if (sessionId) {
      await assertSessionAccess(session, sessionId);
    } else {
      await assertMemberAccess(session, body.memberId!);
      sessionId = await resolveSessionId(session, body.memberId!);
    }
  } catch {
    return apiError("Not found", 404);
  }

  const [target] = await db
    .select({ memberId: sessions.memberId })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);
  if (!target) return apiError("Not found", 404);

  const pain = body.pain && !/^(none|no|-)$/i.test(body.pain) ? body.pain : "";
  const notes = [
    `Performance: ${body.performance}.`,
    pain ? `Pain / issue: ${pain}.` : "No pain reported.",
    body.nextNote ? `Next session: ${body.nextNote}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const result = await closeSession({
    sessionId,
    actor: session,
    rpe: body.rpe ?? PERFORMANCE_RPE[body.performance],
    energy: body.energy,
    notes,
    painFlag: Boolean(pain),
  });
  if ("error" in result && result.error) return apiError(result.error, 400);

  if (body.nextNote) {
    await db.insert(coachNotes).values({
      organisationId: session.organisationId,
      memberId: target.memberId,
      trainerId: session.userId,
      body: `Next session: ${body.nextNote}`,
    });
  }

  await db
    .update(coachingRelationships)
    .set({ needsFollowUp: false })
    .where(
      and(
        eq(coachingRelationships.memberId, target.memberId),
        eq(coachingRelationships.trainerId, session.userId),
      ),
    );

  return apiOk({ sessionId, escalated: result.escalated });
}
