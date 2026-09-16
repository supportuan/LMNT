import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { coachingRelationships, members, roleAssignments } from "@/db/schema";
import { assertMemberAccess } from "@/lib/access";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { memberInScope } from "@/lib/branch-scope";
import { assignTrainerToMember } from "@/lib/domain/membership-service";
import { PERMISSIONS } from "@/lib/permissions";

const patchSchema = z.object({
  memberId: z.string().uuid(),
  needsFollowUp: z.boolean(),
});

const assignSchema = z.object({
  memberId: z.string().uuid(),
  trainerId: z.string().uuid().nullable(),
});

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_EDIT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = assignSchema.parse(await request.json());

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
    return apiError("Not found", 404);
  }

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
    if (trainer.centreId && trainer.centreId !== member.centreId) {
      return apiError("Trainer is not assigned to this branch", 400);
    }
  }

  await assignTrainerToMember({
    organisationId: member.organisationId,
    centreId: member.centreId,
    memberId: member.id,
    trainerId: body.trainerId,
  });

  await writeAudit(session, "member.trainer_assigned", "member", member.id, {
    trainerId: body.trainerId,
  });

  return apiOk({});
}

export async function PATCH(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_EDIT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = patchSchema.parse(await request.json());

  try {
    await assertMemberAccess(session, body.memberId);
  } catch {
    return apiError("Not found", 404);
  }

  await db
    .update(coachingRelationships)
    .set({ needsFollowUp: body.needsFollowUp })
    .where(
      and(
        eq(coachingRelationships.memberId, body.memberId),
        eq(coachingRelationships.trainerId, session.userId),
      ),
    );

  return apiOk({});
}
