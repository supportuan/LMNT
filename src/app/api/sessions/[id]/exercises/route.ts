import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { sessionExerciseLogs, sessions } from "@/db/schema";
import { assertSessionAccess } from "@/lib/access";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/permissions";

const exerciseSchema = z.object({
  exerciseName: z.string(),
  movementPattern: z.string().optional(),
  targetPrescription: z.string().optional(),
  load: z.string().optional(),
  reps: z.string().optional(),
  rpe: z.number().nullable().optional(),
  status: z.enum(["completed", "skipped", "modified"]).optional(),
  sortOrder: z.number().optional(),
  notes: z.string().optional(),
  progressionTag: z.enum(["hold", "up", "down"]).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error, session } = await requireApiSession(PERMISSIONS.SESSION_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  try {
    await assertSessionAccess(session, id);
  } catch {
    return apiError("Not found", 404);
  }

  const logs = await db
    .select()
    .from(sessionExerciseLogs)
    .where(eq(sessionExerciseLogs.sessionId, id))
    .orderBy(sessionExerciseLogs.sortOrder);

  return apiOk({ logs });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error, session } = await requireApiSession(PERMISSIONS.SESSION_LOG);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  try {
    await assertSessionAccess(session, id);
  } catch {
    return apiError("Not found", 404);
  }

  const body = z.object({ exercises: z.array(exerciseSchema) }).parse(await request.json());

  const [s] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  if (!s) return apiError("Not found", 404);

  await db.delete(sessionExerciseLogs).where(eq(sessionExerciseLogs.sessionId, id));

  for (const [i, ex] of body.exercises.entries()) {
    await db.insert(sessionExerciseLogs).values({
      organisationId: s.organisationId,
      sessionId: id,
      exerciseName: ex.exerciseName,
      movementPattern: ex.movementPattern,
      targetPrescription: ex.targetPrescription,
      load: ex.load,
      reps: ex.reps,
      rpe: ex.rpe ?? undefined,
      status: ex.status ?? "completed",
      sortOrder: ex.sortOrder ?? i,
      notes: ex.notes,
      progressionTag: ex.progressionTag,
    });
  }

  await writeAudit(session, "session.exercises_logged", "session", id);
  return apiOk({});
}
