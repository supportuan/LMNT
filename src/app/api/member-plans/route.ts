import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { memberPlans, members, orgPackages, paymentRecords, roleAssignments } from "@/db/schema";
import { assertMemberAccess } from "@/lib/access";
import { apiError, apiOk, requireApiSession, resolveCentreId } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { centreInScope, memberInScope } from "@/lib/branch-scope";
import { assignTrainerToMember } from "@/lib/domain/membership-service";
import { PERMISSIONS } from "@/lib/permissions";
import { DEFAULT_TRAINER_SHARE_BPS } from "@/lib/trainer-share";

const sellSchema = z.object({
  memberId: z.string().uuid(),
  packageId: z.string().uuid(),
  trainerId: z.string().uuid().optional(),
  centreId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_CREATE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = sellSchema.parse(await request.json());

  const [member] = await db
    .select({
      id: members.id,
      organisationId: members.organisationId,
      centreId: members.centreId,
    })
    .from(members)
    .where(eq(members.id, body.memberId))
    .limit(1);

  if (!member || member.organisationId !== session.organisationId || !memberInScope(session, member.centreId)) {
    return apiError("Member not found", 404);
  }

  const centreId = resolveCentreId(session, body.centreId) ?? member.centreId;
  if (!memberInScope(session, centreId)) return apiError("Branch not in workspace", 400);

  const [pkg] = await db
    .select()
    .from(orgPackages)
    .where(and(eq(orgPackages.id, body.packageId), eq(orgPackages.organisationId, session.organisationId)))
    .limit(1);

  if (!pkg || !pkg.active) return apiError("Plan not found", 404);

  if (body.trainerId) {
    const [trainer] = await db
      .select({ id: roleAssignments.id, centreId: roleAssignments.centreId })
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, body.trainerId),
          eq(roleAssignments.organisationId, session.organisationId),
          eq(roleAssignments.role, "trainer"),
        ),
      )
      .limit(1);
    if (!trainer) return apiError("Trainer not found", 400);
    if (trainer.centreId && trainer.centreId !== centreId) {
      return apiError("Trainer is not assigned to this branch", 400);
    }
  }

  await db
    .update(memberPlans)
    .set({ status: "expired" })
    .where(and(eq(memberPlans.memberId, member.id), eq(memberPlans.status, "active")));

  const [plan] = await db
    .insert(memberPlans)
    .values({
      organisationId: member.organisationId,
      centreId,
      memberId: member.id,
      planName: pkg.name,
      status: "active",
      totalSessions: pkg.sessionCount,
      sessionsRemaining: pkg.sessionCount,
      packageValue: pkg.priceInr,
      amountDue: pkg.priceInr,
      trainerShareBps: pkg.trainerShareBps ?? DEFAULT_TRAINER_SHARE_BPS,
      startsAt: new Date(),
    })
    .returning();

  if (body.trainerId) {
    await assignTrainerToMember({
      organisationId: member.organisationId,
      centreId,
      memberId: member.id,
      trainerId: body.trainerId,
    });
  }

  await writeAudit(session, "member_plan.sold", "member_plan", plan.id, {
    memberId: member.id,
    packageId: pkg.id,
    trainerId: body.trainerId,
    centreId,
  });

  return apiOk({ plan });
}

/** @deprecated Prefer POST /api/payment-records */
const patchSchema = z.object({
  planId: z.string().uuid(),
  paymentAmount: z.number().positive(),
});

export async function PATCH(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.OWN_REVENUE_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = patchSchema.parse(await request.json());

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

  await db.transaction(async (tx) => {
    await tx
      .update(memberPlans)
      .set({ amountDue: newDue })
      .where(eq(memberPlans.id, body.planId));

    await tx.insert(paymentRecords).values({
      organisationId: plan.organisationId,
      centreId: plan.centreId,
      memberId: plan.memberId,
      planId: body.planId,
      amountInr: body.paymentAmount,
      method: "upi",
      recordedBy: session.userId,
    });
  });

  return apiOk({ amountDue: newDue });
}
