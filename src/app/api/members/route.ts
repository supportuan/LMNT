import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { coachNotes, coachingRelationships, memberPlans, members, orgPackages, roleAssignments } from "@/db/schema";
import { assertMemberAccess } from "@/lib/access";
import { apiError, apiOk, centreIdForSession, requireApiSession, resolveCentreId } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { composeMemberName } from "@/lib/member-intake";
import { PERMISSIONS } from "@/lib/permissions";
import { DEFAULT_TRAINER_SHARE_BPS } from "@/lib/trainer-share";

const genderSchema = z.enum(["male", "female", "other", "prefer_not_to_say"]);

const createSchema = z
  .object({
    intakeOnly: z.boolean().optional(),
    name: z.string().min(1).optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    gender: genderSchema.optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    intakeFeedback: z.string().optional(),
    goal: z.string().optional(),
    planName: z.string().optional(),
    totalSessions: z.number().min(1).optional(),
    packageValue: z.number().min(0).optional(),
    amountDue: z.number().min(0).optional(),
    trainerShareBps: z.number().int().min(0).max(10000).optional(),
    centreId: z.string().uuid().optional(),
    trainerId: z.string().uuid().optional(),
    trainingDays: z.string().max(80).optional(),
    trainingTime: z.string().max(40).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    const hasLegacyName = Boolean(data.name?.trim());
    const hasIntakeName = Boolean(data.firstName?.trim() && data.lastName?.trim());
    if (!hasLegacyName && !hasIntakeName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "First name and last name are required",
        path: ["firstName"],
      });
    }
    if (data.intakeOnly && !data.phone?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Contact number is required",
        path: ["phone"],
      });
    }
  });

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_CREATE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiError(err.issues.map((i) => i.message).join("; "), 400);
    }
    throw err;
  }

  const centreId = resolveCentreId(session, body.centreId) ?? centreIdForSession(session);
  if (!centreId) return apiError("No centre assigned", 400);

  const displayName = body.name?.trim()
    ? body.name.trim()
    : composeMemberName(body.firstName!, body.lastName!);

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

  const wantsMembership =
    !body.intakeOnly &&
    (Boolean(body.planName) ||
      body.totalSessions != null ||
      body.packageValue != null ||
      session.activeRole === "trainer");

  let trainerShareBps = body.trainerShareBps;
  if (wantsMembership && trainerShareBps == null && body.planName) {
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
      name: displayName,
      firstName: body.firstName?.trim() || null,
      lastName: body.lastName?.trim() || null,
      dateOfBirth: body.dateOfBirth ?? null,
      gender: body.gender ?? null,
      email: body.email,
      phone: body.phone,
      emergencyContactName: body.emergencyContactName?.trim() || null,
      emergencyContactPhone: body.emergencyContactPhone?.trim() || null,
      intakeFeedback: body.intakeFeedback?.trim() || null,
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

  if (wantsMembership) {
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
      trainerId: assignedTrainerId ?? null,
      trainingDays: body.trainingDays || null,
      trainingTime: body.trainingTime || null,
      startsAt: new Date(),
    });
  }

  if (body.notes && assignedTrainerId) {
    await db.insert(coachNotes).values({
      organisationId: session.organisationId,
      memberId: member.id,
      trainerId: assignedTrainerId,
      body: body.notes,
    });
  }

  await writeAudit(session, "member.created", "member", member.id);
  return apiOk({ member, created: true });
}

export async function PATCH(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_EDIT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = z
    .object({
      memberId: z.string().uuid(),
      name: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
      gender: genderSchema.optional().nullable(),
      phone: z.string().optional(),
      email: z.string().email().optional().nullable(),
      emergencyContactName: z.string().optional().nullable(),
      emergencyContactPhone: z.string().optional().nullable(),
      intakeFeedback: z.string().optional().nullable(),
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
  if (body.firstName !== undefined) updates.firstName = body.firstName;
  if (body.lastName !== undefined) updates.lastName = body.lastName;
  if (body.firstName !== undefined && body.lastName !== undefined) {
    updates.name = composeMemberName(body.firstName, body.lastName);
  } else if (body.name) {
    updates.name = body.name;
  }
  if (body.dateOfBirth !== undefined) updates.dateOfBirth = body.dateOfBirth;
  if (body.gender !== undefined) updates.gender = body.gender;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.email !== undefined) updates.email = body.email ?? null;
  if (body.emergencyContactName !== undefined) updates.emergencyContactName = body.emergencyContactName;
  if (body.emergencyContactPhone !== undefined) updates.emergencyContactPhone = body.emergencyContactPhone;
  if (body.intakeFeedback !== undefined) updates.intakeFeedback = body.intakeFeedback;
  if (body.goal !== undefined) updates.goal = body.goal;
  if (body.status) updates.status = body.status;

  await db.update(members).set(updates).where(eq(members.id, body.memberId));
  await writeAudit(session, "member.updated", "member", body.memberId);
  return apiOk({});
}