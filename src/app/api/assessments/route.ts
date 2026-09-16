import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assessments } from "@/db/schema";
import { assertMemberAccess } from "@/lib/access";
import { apiError, apiOk, centreIdForSession, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { publishEvent } from "@/lib/domain/publish-event";
import {
  assertAssessmentTransition,
  InvalidStateTransitionError,
} from "@/lib/domain/state-machines";
import { PERMISSIONS } from "@/lib/permissions";

const schema = z.object({
  memberId: z.string().uuid(),
  status: z.enum(["draft", "in_progress", "completed", "referred"]).optional(),
  parqCleared: z.boolean().optional(),
  referralRequired: z.boolean().optional(),
  scores: z.record(z.string(), z.number()).optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.ASSESSMENT_CREATE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const centreId = centreIdForSession(session);
  if (!centreId) return apiError("No centre assigned", 400);

  const body = schema.parse(await request.json());
  try {
    await assertMemberAccess(session, body.memberId);
  } catch {
    return apiError("Not found", 404);
  }

  const [assessment] = await db
    .insert(assessments)
    .values({
      organisationId: session.organisationId,
      centreId,
      memberId: body.memberId,
      trainerId: session.userId,
      status: body.status ?? "in_progress",
      parqCleared: body.parqCleared ?? false,
      referralRequired: body.referralRequired ?? false,
      scores: body.scores,
      notes: body.notes,
      completedAt: body.status === "completed" ? new Date() : null,
    })
    .returning();

  await writeAudit(session, "assessment.created", "assessment", assessment.id);
  return apiOk({ assessment });
}

export async function PATCH(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.ASSESSMENT_EDIT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = schema.extend({ id: z.string().uuid() }).parse(await request.json());

  const [existing] = await db
    .select()
    .from(assessments)
    .where(eq(assessments.id, body.id))
    .limit(1);
  if (!existing) return apiError("Not found", 404);

  try {
    await assertMemberAccess(session, existing.memberId);
  } catch {
    return apiError("Not found", 404);
  }

  const updates: Partial<typeof assessments.$inferInsert> = {};
  if (body.status && body.status !== existing.status) {
    try {
      assertAssessmentTransition(existing.status, body.status);
    } catch (e) {
      if (e instanceof InvalidStateTransitionError) {
        return apiError(e.message, 400);
      }
      throw e;
    }
    updates.status = body.status;
    if (body.status === "completed") updates.completedAt = new Date();
  }
  if (body.parqCleared !== undefined) updates.parqCleared = body.parqCleared;
  if (body.referralRequired !== undefined) updates.referralRequired = body.referralRequired;
  if (body.scores) updates.scores = body.scores;
  if (body.notes !== undefined) updates.notes = body.notes;

  const referralNewlyRequired =
    body.referralRequired === true && !existing.referralRequired;

  await db.transaction(async (tx) => {
    await tx.update(assessments).set(updates).where(eq(assessments.id, body.id));

    if (updates.status === "completed") {
      await publishEvent(tx, {
        organisationId: session.organisationId,
        type: "AssessmentCompleted",
        actorId: session.userId,
        entityType: "assessment",
        entityId: body.id,
        payload: { memberId: existing.memberId },
      });
    }

    if (referralNewlyRequired) {
      await publishEvent(tx, {
        organisationId: session.organisationId,
        type: "ReferralRequired",
        actorId: session.userId,
        entityType: "assessment",
        entityId: body.id,
        payload: { memberId: existing.memberId },
      });
    }
  });

  await writeAudit(session, "assessment.updated", "assessment", body.id);
  return apiOk({});
}
