import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  coachingRelationships,
  memberPlans,
  members,
  programmes,
  sessionExerciseLogs,
  sessions,
} from "@/db/schema";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { PERMISSIONS } from "@/lib/permissions";

const exerciseSchema = z.object({
  exerciseName: z.string(),
  movementPattern: z.string().optional(),
  targetPrescription: z.string().optional(),
  load: z.string().optional(),
  reps: z.string().optional(),
  rpe: z.number().nullable().optional(),
  sortOrder: z.number().optional(),
});

const bodySchema = z.object({
  rpe: z.number().min(1).max(10).optional(),
  exercises: z.array(exerciseSchema).optional(),
});

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.PROGRAM_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = bodySchema.parse(await request.json().catch(() => ({})));

  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.userId, session.userId))
    .limit(1);
  if (!member) return apiError("Member not found", 404);

  const [rel] = await db
    .select()
    .from(coachingRelationships)
    .where(and(eq(coachingRelationships.memberId, member.id), eq(coachingRelationships.active, true)))
    .limit(1);
  if (!rel) return apiError("No trainer assigned", 400);

  const [programme] = await db
    .select()
    .from(programmes)
    .where(and(eq(programmes.memberId, member.id), eq(programmes.status, "active")))
    .limit(1);

  const [scheduled] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.memberId, member.id), eq(sessions.status, "scheduled")))
    .orderBy(sessions.scheduledAt)
    .limit(1);

  let sessionId: string;

  if (scheduled) {
    await db
      .update(sessions)
      .set({ status: "completed", completedAt: new Date(), rpe: body.rpe ?? null })
      .where(eq(sessions.id, scheduled.id));
    sessionId = scheduled.id;
  } else {
    const [created] = await db
      .insert(sessions)
      .values({
        organisationId: member.organisationId,
        centreId: member.centreId,
        memberId: member.id,
        trainerId: rel.trainerId,
        programmeId: programme?.id,
        status: "completed",
        scheduledAt: new Date(),
        completedAt: new Date(),
        rpe: body.rpe ?? null,
      })
      .returning();
    sessionId = created.id;
  }

  if (body.exercises?.length) {
    await db.delete(sessionExerciseLogs).where(eq(sessionExerciseLogs.sessionId, sessionId));
    for (const [i, ex] of body.exercises.entries()) {
      await db.insert(sessionExerciseLogs).values({
        organisationId: member.organisationId,
        sessionId,
        exerciseName: ex.exerciseName,
        movementPattern: ex.movementPattern,
        targetPrescription: ex.targetPrescription,
        load: ex.load,
        reps: ex.reps,
        rpe: ex.rpe ?? undefined,
        sortOrder: ex.sortOrder ?? i,
        status: "completed",
      });
    }
  }

  await db
    .update(memberPlans)
    .set({
      sessionsRemaining: sql`GREATEST(${memberPlans.sessionsRemaining} - 1, 0)`,
    })
    .where(and(eq(memberPlans.memberId, member.id), eq(memberPlans.status, "active")));

  return apiOk({ sessionId });
}
