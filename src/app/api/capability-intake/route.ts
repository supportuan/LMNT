import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assessments } from "@/db/schema";
import { assertMemberAccess } from "@/lib/access";
import { apiError, apiOk, centreIdForSession, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import {
  type CapabilityIntake,
  computeCapability,
  DEFAULT_CAPABILITY_INTAKE,
} from "@/lib/capability-score";
import { MOVEMENT_PATTERNS } from "@/lib/coach-pro/readiness";
import { PERMISSIONS } from "@/lib/permissions";

const intakeSchema = z.object({
  memberId: z.string().uuid(),
  assessmentId: z.string().uuid().optional(),
  intake: z.object({
    parq: z.object({
      chestPain: z.boolean(),
      boneJoint: z.boolean(),
      bloodPressure: z.boolean(),
      dizziness: z.boolean(),
      otherRisk: z.boolean(),
    }),
    lifestyle: z.object({
      activityLevel: z.enum(["low", "moderate", "high"]),
      stress: z.enum(["low", "moderate", "high"]),
      nutrition: z.enum(["poor", "fair", "good"]),
      sleepHours: z.number().min(0).max(14),
    }),
    medical: z.object({
      conditions: z.string(),
      medications: z.string(),
      injuries: z.string(),
      clearanceObtained: z.boolean(),
    }),
    fitness: z.object({
      trainingAgeMonths: z.number().min(0).max(600),
      movementScores: z.record(z.string(), z.number().min(0).max(5)),
    }),
  }),
  complete: z.boolean().optional(),
});

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.ASSESSMENT_CREATE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const centreId = centreIdForSession(session);
  if (!centreId) return apiError("No centre assigned", 400);

  const body = intakeSchema.parse(await request.json());
  try {
    await assertMemberAccess(session, body.memberId);
  } catch {
    return apiError("Not found", 404);
  }

  const intake = body.intake as CapabilityIntake;
  for (const p of MOVEMENT_PATTERNS) {
    if (intake.fitness.movementScores[p] == null) {
      intake.fitness.movementScores[p] = DEFAULT_CAPABILITY_INTAKE.fitness.movementScores[p];
    }
  }

  const { score, profile } = computeCapability(intake);
  const parqCleared = Object.values(intake.parq).every((v) => !v) || intake.medical.clearanceObtained;
  const referralRequired = profile.bucket === "refer";
  const status = body.complete ? (referralRequired ? "referred" : "completed") : "in_progress";

  let assessmentId = body.assessmentId;

  if (assessmentId) {
    const [existing] = await db.select().from(assessments).where(eq(assessments.id, assessmentId)).limit(1);
    if (!existing || existing.memberId !== body.memberId) return apiError("Assessment not found", 404);

    const [row] = await db
      .update(assessments)
      .set({
        intakeData: intake,
        capabilityScore: score,
        capabilityProfile: profile,
        scores: { ...intake.fitness.movementScores, capability: score },
        parqCleared,
        referralRequired,
        notes: profile.rationale,
        status,
        completedAt: status === "completed" || status === "referred" ? new Date() : null,
      })
      .where(eq(assessments.id, assessmentId))
      .returning();
    assessmentId = row.id;
  } else {
    const [row] = await db
      .insert(assessments)
      .values({
        organisationId: session.organisationId,
        centreId,
        memberId: body.memberId,
        trainerId: session.activeRole === "trainer" ? session.userId : null,
        intakeData: intake,
        capabilityScore: score,
        capabilityProfile: profile,
        scores: { ...intake.fitness.movementScores, capability: score },
        parqCleared,
        referralRequired,
        notes: profile.rationale,
        status,
        completedAt: status === "completed" || status === "referred" ? new Date() : null,
      })
      .returning();
    assessmentId = row.id;
  }

  await writeAudit(session, "capability.generated", "assessment", assessmentId, {
    score,
    bucket: profile.bucket,
  });

  return apiOk({
    output: "Capability score generated",
    assessmentId,
    capabilityScore: score,
    profile,
  });
}