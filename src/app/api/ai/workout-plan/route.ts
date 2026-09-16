import { z } from "zod";
import { db } from "@/db";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { generateWorkoutPlan } from "@/lib/intelligence/generate-workout-plan";
import { recordAiRecommendation } from "@/lib/intelligence/recommendation-service";
import { PERMISSIONS } from "@/lib/permissions";
import { getMemberContextForAi } from "@/modules/queries";

const bodySchema = z.object({
  memberId: z.string().uuid(),
  weeks: z.number().min(1).max(12).default(4),
  daysPerWeek: z.number().min(1).max(6).default(3),
  experience: z.string().optional(),
  injuries: z.string().optional(),
  focus: z.string().optional(),
});

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.PROGRAM_CREATE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = bodySchema.parse(await request.json());
  const context = await getMemberContextForAi(body.memberId, session.organisationId);
  if (!context) return apiError("Member not found", 404);

  const generated = await generateWorkoutPlan({
    context,
    weeks: body.weeks,
    daysPerWeek: body.daysPerWeek,
    experience: body.experience,
    injuries: body.injuries,
    focus: body.focus,
  });

  const recommendation = await db.transaction(async (tx) =>
    recordAiRecommendation(tx, {
      organisationId: session.organisationId,
      centreId: context.member.centreId,
      memberId: context.member.id,
      trainerId: session.userId,
      type: "workout_plan",
      requestInput: body,
      output: { plan: generated.plan },
      explanation: generated.explanation,
      modelSource: generated.modelSource,
    }),
  );

  await writeAudit(session, "ai_recommendation.generated", "ai_recommendation", recommendation.id, {
    type: "workout_plan",
    memberId: context.member.id,
  });

  return apiOk({
    recommendationId: recommendation.id,
    plan: generated.plan,
    explanation: generated.explanation,
    source: generated.modelSource,
    saved: false,
  });
}
