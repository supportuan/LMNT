import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { aiRecommendations } from "@/db/schema";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { resolveAiRecommendation } from "@/lib/intelligence/recommendation-service";
import { PERMISSIONS } from "@/lib/permissions";

const patchSchema = z.object({
  status: z.enum(["accepted", "overridden", "rejected"]),
  overrideSuggestions: z.array(z.string()).optional(),
  overridePlan: z.string().optional(),
  programmeTitle: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireApiSession(PERMISSIONS.MESSAGE_CLIENT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const { id } = await params;
  const body = patchSchema.parse(await request.json());

  const [recommendation] = await db
    .select()
    .from(aiRecommendations)
    .where(
      and(
        eq(aiRecommendations.id, id),
        eq(aiRecommendations.organisationId, session.organisationId),
        eq(aiRecommendations.trainerId, session.userId),
      ),
    )
    .limit(1);

  if (!recommendation) return apiError("Not found", 404);
  if (body.status === "overridden" && recommendation.status !== "generated") {
    return apiError("Can only override a fresh recommendation", 400);
  }

  if (
    (body.status === "accepted" || body.status === "rejected") &&
    recommendation.status !== "generated" &&
    recommendation.status !== "overridden"
  ) {
    return apiError("Recommendation already resolved", 400);
  }

  let overrideOutput: Record<string, unknown> | undefined;
  if (body.status === "overridden") {
    if (recommendation.type === "coach_suggestions" && body.overrideSuggestions) {
      overrideOutput = { suggestions: body.overrideSuggestions };
    } else if (recommendation.type === "workout_plan" && body.overridePlan) {
      overrideOutput = { plan: body.overridePlan };
    } else {
      return apiError("Override content required", 400);
    }
  }

  const updated = await db.transaction(async (tx) =>
    resolveAiRecommendation(tx, {
      recommendation,
      status: body.status,
      actorId: session.userId,
      overrideOutput:
        body.status === "overridden"
          ? overrideOutput
          : recommendation.overrideOutput ?? undefined,
      programmeTitle: body.programmeTitle,
    }),
  );

  await writeAudit(session, `ai_recommendation.${body.status}`, "ai_recommendation", id, {
    type: recommendation.type,
    memberId: recommendation.memberId,
    programmeId: updated.programmeId,
  });

  return apiOk({ recommendation: updated });
}
