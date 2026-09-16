import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { agreementMonthlyReviews, serviceAgreements } from "@/db/schema";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import {
  currentPeriodLabel,
  submitAgreementReview,
  InvalidStateTransitionError,
} from "@/lib/community/agreement-service";
import { assertReviewTransition, InvalidStateTransitionError as ReviewTransitionError } from "@/lib/domain/state-machines";
import { PERMISSIONS } from "@/lib/permissions";

const bodySchema = z.object({
  reviewId: z.string().uuid().optional(),
  periodLabel: z.string().optional(),
  summary: z.string().min(1),
  metrics: z.record(z.string(), z.number()).default({}),
  approve: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireApiSession(PERMISSIONS.PARTNER_MANAGE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const { id: agreementId } = await params;
  const body = bodySchema.parse(await request.json());

  const [agreement] = await db
    .select()
    .from(serviceAgreements)
    .where(
      and(
        eq(serviceAgreements.id, agreementId),
        eq(serviceAgreements.organisationId, session.organisationId),
      ),
    )
    .limit(1);

  if (!agreement) return apiError("Agreement not found", 404);

  const periodLabel = body.periodLabel ?? currentPeriodLabel();

  let [review] = body.reviewId
    ? await db
        .select()
        .from(agreementMonthlyReviews)
        .where(eq(agreementMonthlyReviews.id, body.reviewId))
        .limit(1)
    : await db
        .select()
        .from(agreementMonthlyReviews)
        .where(
          and(
            eq(agreementMonthlyReviews.agreementId, agreementId),
            eq(agreementMonthlyReviews.periodLabel, periodLabel),
          ),
        )
        .limit(1);

  if (!review) {
    [review] = await db
      .insert(agreementMonthlyReviews)
      .values({
        agreementId,
        periodLabel,
        status: "pending",
      })
      .returning();
  }

  if (body.approve) {
    try {
      assertReviewTransition(review.status, "approved");
    } catch (e) {
      if (e instanceof ReviewTransitionError) return apiError(e.message, 400);
      throw e;
    }

    const [approved] = await db
      .update(agreementMonthlyReviews)
      .set({
        status: "approved",
        approvedBy: session.userId,
        approvedAt: new Date(),
      })
      .where(eq(agreementMonthlyReviews.id, review.id))
      .returning();

    return apiOk({ review: approved });
  }

  try {
    const submitted = await db.transaction(async (tx) =>
      submitAgreementReview(tx, {
        reviewId: review.id,
        organisationId: session.organisationId,
        agreementId,
        from: review.status,
        summary: body.summary,
        metrics: body.metrics,
        actorId: session.userId,
      }),
    );
    return apiOk({ review: submitted });
  } catch (e) {
    if (e instanceof InvalidStateTransitionError) return apiError(e.message, 400);
    throw e;
  }
}
