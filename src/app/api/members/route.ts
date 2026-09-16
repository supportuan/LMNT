import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { coachingRelationships, memberPlans, members, orgPackages, roleAssignments } from "@/db/schema";
import { assertMemberAccess } from "@/lib/access";
import { apiError, apiOk, centreIdForSession, requireApiSession, resolveCentreId } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/permissions";
import { DEFAULT_TRAINER_SHARE_BPS } from "@/lib/trainer-share";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  goal: z.string().optional(),
  planName: z.string().optional(),
  totalSessions: z.number().min(1).optional(),
  packageValue: z.number().min(0).optional(),
  amountDue: z.number().min(0).optional(),
  trainerShareBps: z.number().int().min(0).max(10000).optional(),
  centreId: z.string().uuid().optional(),
  trainerId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_CREATE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = createSchema.parse(await request.json());
  const centreId = resolveCentreId(session, body.centreId) ?? centreIdForSession(session);
  if (!centreId) return apiError("No centre assigned", 400);

  const assignedTrainerId = session.activeRole === "trainer" ? session.userId : body.trainerId;
  if (assignedTrainerId && session.activeRole !== "trainer") {
    const [trainer] = await db
      .select({ id: roleAssignments.id })
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, assignedTrainerId),
          eq(roleAssignments.organisationId, session.organisationId),
          eq(roleAssignments.role, "trainer"),
        ),
      )
      .limit(1);
    if (!trainer) return apiError("Trainer not found", 400);
  }

  let trainerShareBps = body.trainerShareBps;
  if (trainerShareBps == null && body.planName) {
    const [pkg] = await db
      .select({ trainerShareBps: orgPackages.trainerShareBps })
      .from(orgPackages)
      .where(and(eq(orgPackages.organisationId, session.organisationId), eq(orgPackages.name, body.planName)))
      .limit(1);
    trainerShareBps = pkg?.trainerShareBps;
  }

  const [member] = await db
    .insert(members)
    .values({
      organisationId: session.organisationId,
      centreId,
      name: body.name,
      email: body.email,
      phone: body.phone,
      goal: body.goal,
      status: "active",
    })
    .returning();

  if (assignedTrainerId) {
    await db.insert(coachingRelationships).values({
      organisationId: session.organisationId,
      centreId,
      memberId: member.id,
      trainerId: assignedTrainerId,
      active: true,
    });
  }

  const totalSessions = body.totalSessions ?? 12;
  await db.insert(memberPlans).values({
    organisationId: session.organisationId,
    centreId,
    memberId: member.id,
    planName: body.planName ?? "PT Package",
    status: "active",
    totalSessions,
    sessionsRemaining: totalSessions,
    packageValue: body.packageValue ?? 0,
    amountDue: body.amountDue ?? body.packageValue ?? 0,
    trainerShareBps: trainerShareBps ?? DEFAULT_TRAINER_SHARE_BPS,
    startsAt: new Date(),
  });

  await writeAudit(session, "member.created", "member", member.id);
  return apiOk({ member });
}

export async function PATCH(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_EDIT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = z
    .object({
      memberId: z.string().uuid(),
      name: z.string().optional(),
      goal: z.string().optional(),
      status: z.enum(["active", "paused", "expired"]).optional(),
    })
    .parse(await request.json());

  try {
    await assertMemberAccess(session, body.memberId);
  } catch {
    return apiError("Not found", 404);
  }

  const updates: Partial<typeof members.$inferInsert> = { updatedAt: new Date() };
  if (body.name) updates.name = body.name;
  if (body.goal !== undefined) updates.goal = body.goal;
  if (body.status) updates.status = body.status;

  await db.update(members).set(updates).where(eq(members.id, body.memberId));
  await writeAudit(session, "member.updated", "member", body.memberId);
  return apiOk({});
}
