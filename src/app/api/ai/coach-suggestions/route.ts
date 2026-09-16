import { db } from "@/db";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { generateCoachSuggestions } from "@/lib/intelligence/generate-coach-suggestions";
import { recordAiRecommendation } from "@/lib/intelligence/recommendation-service";
import { PERMISSIONS } from "@/lib/permissions";
import { getMemberContextForAi } from "@/modules/queries";
import { z } from "zod";

const bodySchema = z.object({
  memberId: z.string().uuid(),
  topic: z.string().optional(),
  scenario: z
    .enum(["lead", "first_session", "floor", "progress", "renewal", "consult"])
    .optional(),
});

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.MESSAGE_CLIENT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = bodySchema.parse(await request.json());
  const context = await getMemberContextForAi(body.memberId, session.organisationId);
  if (!context) return apiError("Member not found", 404);

  const generated = await generateCoachSuggestions({
    context,
    scenario: body.scenario,
    topic: body.topic,
  });

  const recommendation = await db.transaction(async (tx) =>
    recordAiRecommendation(tx, {
      organisationId: session.organisationId,
      centreId: context.member.centreId,
      memberId: context.member.id,
      trainerId: session.userId,
      type: "coach_suggestions",
      requestInput: body,
      output: { suggestions: generated.suggestions, raw: generated.raw },
      explanation: generated.explanation,
      modelSource: generated.modelSource,
    }),
  );

  await writeAudit(session, "ai_recommendation.generated", "ai_recommendation", recommendation.id, {
    type: "coach_suggestions",
    memberId: context.member.id,
  });

  return apiOk({
    recommendationId: recommendation.id,
    suggestions: generated.suggestions,
    explanation: generated.explanation,
    source: generated.modelSource,
    note: generated.note,
  });
}
