import { and, eq } from "drizzle-orm";
import { agreementMonthlyReviews, serviceAgreements } from "@/db/schema";
import type { db } from "@/db";
import { publishEvent } from "@/lib/domain/publish-event";
import {
  assertAgreementTransition,
  assertReviewTransition,
  InvalidStateTransitionError,
} from "@/lib/domain/state-machines";

type DbExecutor = Pick<typeof db, "insert" | "update" | "select">;

export function currentPeriodLabel(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function transitionAgreement(
  tx: DbExecutor,
  input: {
    agreementId: string;
    organisationId: string;
    from: (typeof serviceAgreements.$inferSelect)["status"];
    to: (typeof serviceAgreements.$inferSelect)["status"];
    actorId: string;
  },
) {
  assertAgreementTransition(input.from, input.to);

  const [agreement] = await tx
    .update(serviceAgreements)
    .set({ status: input.to, updatedAt: new Date() })
    .where(eq(serviceAgreements.id, input.agreementId))
    .returning();

  if (input.to === "active") {
    await publishEvent(tx, {
      organisationId: input.organisationId,
      type: "AgreementActivated",
      actorId: input.actorId,
      entityType: "service_agreement",
      entityId: input.agreementId,
      payload: { partnerId: agreement.partnerId, centreId: agreement.centreId },
    });

    const periodLabel = currentPeriodLabel();
    const [existing] = await tx
      .select()
      .from(agreementMonthlyReviews)
      .where(
        and(
          eq(agreementMonthlyReviews.agreementId, input.agreementId),
          eq(agreementMonthlyReviews.periodLabel, periodLabel),
        ),
      )
      .limit(1);

    if (!existing) {
      await tx.insert(agreementMonthlyReviews).values({
        agreementId: input.agreementId,
        periodLabel,
        status: "pending",
      });
    }
  }

  return agreement;
}

export async function submitAgreementReview(
  tx: DbExecutor,
  input: {
    reviewId: string;
    organisationId: string;
    agreementId: string;
    from: (typeof agreementMonthlyReviews.$inferSelect)["status"];
    summary: string;
    metrics: Record<string, number>;
    actorId: string;
  },
) {
  assertReviewTransition(input.from, "submitted");

  const [review] = await tx
    .update(agreementMonthlyReviews)
    .set({
      status: "submitted",
      summary: input.summary,
      metrics: input.metrics,
      submittedBy: input.actorId,
      submittedAt: new Date(),
    })
    .where(eq(agreementMonthlyReviews.id, input.reviewId))
    .returning();

  await publishEvent(tx, {
    organisationId: input.organisationId,
    type: "AgreementReviewSubmitted",
    actorId: input.actorId,
    entityType: "agreement_monthly_review",
    entityId: input.reviewId,
    payload: { agreementId: input.agreementId, periodLabel: review.periodLabel },
  });

  return review;
}

export { InvalidStateTransitionError };
