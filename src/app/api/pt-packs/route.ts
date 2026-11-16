import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { memberPlans, members, orgPackages, roleAssignments, sessions } from "@/db/schema";
import { assertMemberAccess } from "@/lib/access";
import { apiError, apiOk, requireApiSession, resolveCentreId } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { memberInScope } from "@/lib/branch-scope";
import { assignTrainerToMember } from "@/lib/domain/membership-service";
import { PERMISSIONS } from "@/lib/permissions";
import { generatePtSessionTimes, resolvePackEndDate } from "@/lib/pt-pack-calendar";
import { DEFAULT_TRAINER_SHARE_BPS } from "@/lib/trainer-share";

const createSchema = z.object({
  memberId: z.string().uuid(),
  packageId: z.string().uuid(),
  trainerId: z.string().uuid(),
  centreId: z.string().uuid().optional(),
  startsAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  endsAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  validityMonths: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]).optional(),
  trainingDays: z.string().min(1),
  trainingTime: z.string().min(1),
  renew: z.boolean().optional(),
});

const patchSchema = z.object({
  planId: z.string().uuid(),
  action: z.enum(["pause", "resume", "edit"]),
  trainerId: z.string().uuid().optional(),
  trainingDays: z.string().optional(),
  trainingTime: z.string().optional(),
  endsAt: z.string().optional(),
  startsAt: z.string().optional(),
});

function parseWhen(value: string) {
  if (value.length === 10) return new Date(`${value}T00:00:00.000Z`);
  return new Date(value);
}

export async function GET(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const memberId = new URL(request.url).searchParams.get("memberId");
  const condition = memberId
    ? and(eq(memberPlans.organisationId, session.organisationId), eq(memberPlans.memberId, memberId))
    : eq(memberPlans.organisationId, session.organisationId);

  const rows = await db
    .select({
      id: memberPlans.id,
      memberId: memberPlans.memberId,
      memberName: members.name,
      planName: memberPlans.planName,
      status: memberPlans.status,
      trainerId: memberPlans.trainerId,
      trainingDays: memberPlans.trainingDays,
      trainingTime: memberPlans.trainingTime,
      validityMonths: memberPlans.validityMonths,
      startsAt: memberPlans.startsAt,
      endsAt: memberPlans.endsAt,
      sessionsRemaining: memberPlans.sessionsRemaining,
      totalSessions: memberPlans.totalSessions,
    })
    .from(memberPlans)
    .innerJoin(members, eq(memberPlans.memberId, members.id))
    .where(condition)
    .orderBy(desc(memberPlans.createdAt))
    .limit(50);

  return apiOk({ plans: rows });
}

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_CREATE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = createSchema.parse(await request.json());
  const startsAt = parseWhen(body.startsAt);
  const endsAt = body.endsAt ? parseWhen(body.endsAt) : resolvePackEndDate(startsAt, body.validityMonths);

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

  try {
    await assertMemberAccess(session, member.id);
  } catch {
    return apiError("Member not found", 404);
  }

  const centreId = resolveCentreId(session, body.centreId) ?? member.centreId;

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

  const [pkg] = await db
    .select()
    .from(orgPackages)
    .where(and(eq(orgPackages.id, body.packageId), eq(orgPackages.organisationId, session.organisationId)))
    .limit(1);
  if (!pkg || !pkg.active) return apiError("Pack type not found", 404);

  const result = await db.transaction(async (tx) => {
    if (body.renew !== false) {
      await tx
        .update(memberPlans)
        .set({ status: "expired" })
        .where(and(eq(memberPlans.memberId, member.id), eq(memberPlans.status, "active")));
    }

    const [plan] = await tx
      .insert(memberPlans)
      .values({
        organisationId: member.organisationId,
        centreId,
        memberId: member.id,
        trainerId: body.trainerId,
        planName: pkg.name,
        status: "active",
        totalSessions: pkg.sessionCount,
        sessionsRemaining: pkg.sessionCount,
        packageValue: pkg.priceInr,
        amountDue: pkg.priceInr,
        trainerShareBps: pkg.trainerShareBps ?? DEFAULT_TRAINER_SHARE_BPS,
        trainingDays: body.trainingDays,
        trainingTime: body.trainingTime,
        validityMonths: body.validityMonths ?? null,
        startsAt,
        endsAt,
      })
      .returning();

    await assignTrainerToMember({
      organisationId: member.organisationId,
      centreId,
      memberId: member.id,
      trainerId: body.trainerId,
    });

    const slots = generatePtSessionTimes({
      startsAt,
      endsAt,
      trainingDays: body.trainingDays,
      trainingTime: body.trainingTime,
      sessionCount: pkg.sessionCount,
    });

    const createdSessions = [];
    for (const scheduledAt of slots) {
      const [row] = await tx
        .insert(sessions)
        .values({
          organisationId: member.organisationId,
          centreId,
          memberId: member.id,
          trainerId: body.trainerId,
          kind: "pt",
          scheduledAt,
          status: "scheduled",
        })
        .returning();
      createdSessions.push(row);
    }

    return { plan, sessions: createdSessions };
  });

  await writeAudit(session, "pt_pack.created", "member_plan", result.plan.id, {
    trainerId: body.trainerId,
    sessionCount: result.sessions.length,
  });

  return apiOk({
    output: "PT pack created — sessions added to trainer calendar",
    plan: result.plan,
    calendarSessions: result.sessions.length,
  });
}

export async function PATCH(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_CREATE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = patchSchema.parse(await request.json());

  const [plan] = await db.select().from(memberPlans).where(eq(memberPlans.id, body.planId)).limit(1);
  if (!plan || plan.organisationId !== session.organisationId) return apiError("Not found", 404);

  try {
    await assertMemberAccess(session, plan.memberId);
  } catch {
    return apiError("Not found", 404);
  }

  if (body.action === "pause") {
    await db.update(memberPlans).set({ status: "paused" }).where(eq(memberPlans.id, plan.id));
    await writeAudit(session, "pt_pack.paused", "member_plan", plan.id);
    return apiOk({ output: "PT pack paused" });
  }

  if (body.action === "resume") {
    await db.update(memberPlans).set({ status: "active" }).where(eq(memberPlans.id, plan.id));
    return apiOk({ output: "PT pack resumed" });
  }

  const updates: Partial<typeof memberPlans.$inferInsert> = {};
  if (body.trainerId) updates.trainerId = body.trainerId;
  if (body.trainingDays) updates.trainingDays = body.trainingDays;
  if (body.trainingTime) updates.trainingTime = body.trainingTime;
  if (body.startsAt) updates.startsAt = parseWhen(body.startsAt);
  if (body.endsAt) updates.endsAt = parseWhen(body.endsAt);

  if (body.trainerId) {
    await assignTrainerToMember({
      organisationId: plan.organisationId,
      centreId: plan.centreId,
      memberId: plan.memberId,
      trainerId: body.trainerId,
    });
  }

  if (Object.keys(updates).length) {
    await db.update(memberPlans).set(updates).where(eq(memberPlans.id, plan.id));
  }

  await writeAudit(session, "pt_pack.updated", "member_plan", plan.id, updates);
  return apiOk({ output: "PT pack updated" });
}