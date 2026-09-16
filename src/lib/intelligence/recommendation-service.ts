import { eq } from "drizzle-orm";
import { aiRecommendations, members, programmes } from "@/db/schema";
import type { db } from "@/db";
import { publishEvent } from "@/lib/domain/publish-event";
import type { AiExplanation } from "@/lib/intelligence/explain";

type DbExecutor = Pick<typeof db, "insert" | "update" | "select">;

export type RecommendationType = "coach_suggestions" | "workout_plan";

export async function recordAiRecommendation(
  tx: DbExecutor,
  input: {
    organisationId: string;
    centreId: string | null;
    memberId: string;
    trainerId: string;
    type: RecommendationType;
    requestInput: Record<string, unknown>;
    output: Record<string, unknown>;
    explanation: AiExplanation;
    modelSource: string;
  },
) {
  const [row] = await tx
    .insert(aiRecommendations)
    .values({
      organisationId: input.organisationId,
      centreId: input.centreId,
      memberId: input.memberId,
      trainerId: input.trainerId,
      type: input.type,
      input: input.requestInput,
      output: input.output,
      explanation: input.explanation,
      modelSource: input.modelSource,
      status: "generated",
    })
    .returning();

  await publishEvent(tx, {
    organisationId: input.organisationId,
    type: "AiRecommendationGenerated",
    actorId: input.trainerId,
    entityType: "ai_recommendation",
    entityId: row.id,
    payload: {
      memberId: input.memberId,
      type: input.type,
      modelSource: input.modelSource,
      safetyFlagCount: input.explanation.safetyFlags.length,
    },
  });

  return row;
}

export async function resolveAiRecommendation(
  tx: DbExecutor,
  input: {
    recommendation: typeof aiRecommendations.$inferSelect;
    status: "accepted" | "overridden" | "rejected";
    actorId: string;
    overrideOutput?: Record<string, unknown>;
    programmeTitle?: string;
  },
) {
  let programmeId = input.recommendation.programmeId;

  if (
    input.status === "accepted" &&
    input.recommendation.type === "workout_plan" &&
    !programmeId
  ) {
    const planText =
      (input.overrideOutput?.plan as string | undefined) ??
      (input.recommendation.overrideOutput?.plan as string | undefined) ??
      (input.recommendation.output.plan as string | undefined) ??
      "";

    let centreId = input.recommendation.centreId;
    if (!centreId) {
      const [member] = await tx
        .select({ centreId: members.centreId })
        .from(members)
        .where(eq(members.id, input.recommendation.memberId))
        .limit(1);
      centreId = member?.centreId ?? null;
    }

    if (!centreId) {
      throw new Error("Member centre required to save programme");
    }

    const [programme] = await tx
      .insert(programmes)
      .values({
        organisationId: input.recommendation.organisationId,
        centreId,
        memberId: input.recommendation.memberId,
        trainerId: input.recommendation.trainerId,
        title:
          input.programmeTitle ??
          `AI Plan — ${(input.recommendation.input.focus as string | undefined) ?? "Strength"}`,
        status: "draft",
        content: { markdown: planText },
        startsAt: new Date(),
      })
      .returning();

    programmeId = programme.id;
  }

  const [updated] = await tx
    .update(aiRecommendations)
    .set({
      status: input.status,
      overrideOutput: input.overrideOutput ?? input.recommendation.overrideOutput,
      programmeId,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(aiRecommendations.id, input.recommendation.id))
    .returning();

  await publishEvent(tx, {
    organisationId: input.recommendation.organisationId,
    type: "AiRecommendationResolved",
    actorId: input.actorId,
    entityType: "ai_recommendation",
    entityId: updated.id,
    payload: {
      memberId: input.recommendation.memberId,
      status: input.status,
      type: input.recommendation.type,
      programmeId,
    },
  });

  return updated;
}
