import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { coachingRelationships, memberPlans, members, paymentRecords } from "@/db/schema";
import { assertMemberAccess } from "@/lib/access";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { centreInScope, orgAndCentreScope } from "@/lib/branch-scope";
import { PERMISSIONS } from "@/lib/permissions";

async function trainerMemberIds(session: { userId: string }) {
  const rows = await db
    .select({ memberId: coachingRelationships.memberId })
    .from(coachingRelationships)
    .where(and(eq(coachingRelationships.trainerId, session.userId), eq(coachingRelationships.active, true)));
  return rows.map((row) => row.memberId);
}

export async function GET(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.OWN_REVENUE_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const memberId = new URL(request.url).searchParams.get("memberId");
  const planId = new URL(request.url).searchParams.get("planId");

  if (memberId) {
    try {
      await assertMemberAccess(session, memberId);
    } catch {
      return apiError("Not found", 404);
    }
  }

  let condition = orgAndCentreScope(session, paymentRecords.organisationId, paymentRecords.centreId);
  if (memberId) condition = and(condition, eq(paymentRecords.memberId, memberId))!;
  if (planId) condition = and(condition, eq(paymentRecords.planId, planId))!;

  if (session.activeRole === "trainer" && !memberId) {
    const ids = await trainerMemberIds(session);
    if (ids.length === 0) return apiOk({ payments: [] });
    condition = and(condition, inArray(paymentRecords.memberId, ids))!;
  }

  const rows = await db
    .select()
    .from(paymentRecords)
    .where(condition)
    .orderBy(desc(paymentRecords.createdAt))
    .limit(50);

  return apiOk({ payments: rows });
}

const postSchema = z.object({
  planId: z.string().uuid(),
  paymentAmount: z.number().positive(),
  method: z.enum(["cash", "upi", "card", "bank_transfer", "other"]).optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.OWN_REVENUE_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = postSchema.parse(await request.json());

  const [plan] = await db
    .select({
      id: memberPlans.id,
      amountDue: memberPlans.amountDue,
      memberId: memberPlans.memberId,
      centreId: memberPlans.centreId,
      organisationId: memberPlans.organisationId,
    })
    .from(memberPlans)
    .innerJoin(members, eq(memberPlans.memberId, members.id))
    .where(
      and(
        eq(memberPlans.id, body.planId),
        eq(members.organisationId, session.organisationId),
        eq(memberPlans.status, "active"),
      ),
    )
    .limit(1);

  if (!plan || !centreInScope(session, plan.centreId)) return apiError("Plan not found", 404);

  try {
    await assertMemberAccess(session, plan.memberId);
  } catch {
    return apiError("Plan not found", 404);
  }

  const newDue = Math.max(0, plan.amountDue - body.paymentAmount);

  const [payment] = await db.transaction(async (tx) => {
    await tx
      .update(memberPlans)
      .set({ amountDue: newDue })
      .where(eq(memberPlans.id, body.planId));

    const [row] = await tx
      .insert(paymentRecords)
      .values({
        organisationId: plan.organisationId,
        centreId: plan.centreId,
        memberId: plan.memberId,
        planId: body.planId,
        amountInr: body.paymentAmount,
        method: body.method ?? "upi",
        recordedBy: session.userId,
        notes: body.notes,
      })
      .returning();

    return [row];
  });

  if (!payment) return apiError("Could not record payment", 500);

  await writeAudit(session, "payment.recorded", "payment", payment.id, {
    planId: body.planId,
    amountInr: body.paymentAmount,
  });

  return apiOk({ payment, amountDue: newDue });
}
