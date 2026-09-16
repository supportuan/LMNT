import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { memberPlans, members, sessionFeedback, sessions } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { createSessionEscalationTask } from "@/lib/domain/escalation";
import { publishEvent } from "@/lib/domain/publish-event";
import {
  SessionClosureValidationError,
  shouldEscalateSession,
  validateSessionClosure,
} from "@/lib/domain/session-closure";
import { assertSessionTransition, InvalidStateTransitionError } from "@/lib/domain/state-machines";
import type { SessionPayload } from "@/lib/session";

export { SessionClosureValidationError, InvalidStateTransitionError };

export type CloseSessionInput = {
  sessionId: string;
  actor: SessionPayload;
  rpe?: number | null;
  painFlag?: boolean;
  notes?: string;
  energy?: string;
  memberScore?: number | null;
};

export async function closeSession(input: CloseSessionInput) {
  const [existing] = await db.select().from(sessions).where(eq(sessions.id, input.sessionId)).limit(1);
  if (!existing) return { error: "Not found" as const };

  if (existing.status === "completed") {
    return { error: "Session already completed" as const };
  }

  try {
    assertSessionTransition(existing.status, "completed");
  } catch (e) {
    if (e instanceof InvalidStateTransitionError) {
      return { error: e.message };
    }
    throw e;
  }

  const [feedbackRow] = await db
    .select()
    .from(sessionFeedback)
    .where(eq(sessionFeedback.sessionId, input.sessionId))
    .limit(1);

  const painFlag = input.painFlag ?? existing.painFlag;

  let closure;
  try {
    closure = validateSessionClosure({
      session: { ...existing, painFlag },
      feedback: feedbackRow ?? null,
      incomingRpe: input.rpe,
      incomingEnergy: input.energy,
      incomingNotes: input.notes,
    });
  } catch (e) {
    if (e instanceof SessionClosureValidationError) {
      return { error: e.message };
    }
    throw e;
  }

  const [member] = await db
    .select({ name: members.name })
    .from(members)
    .where(eq(members.id, existing.memberId))
    .limit(1);

  const escalationReasons = shouldEscalateSession({
    painFlag,
    rpe: closure.rpe,
    energy: closure.energy,
    memberScore: input.memberScore ?? feedbackRow?.memberScore,
  });

  await db.transaction(async (tx) => {
    await tx
      .update(sessions)
      .set({
        status: "completed",
        completedAt: new Date(),
        rpe: closure.rpe,
        painFlag,
      })
      .where(eq(sessions.id, input.sessionId));

    if (feedbackRow) {
      await tx
        .update(sessionFeedback)
        .set({
          notes: closure.notes,
          coachScore: closure.rpe,
          energy: closure.energy,
          memberScore: input.memberScore ?? feedbackRow.memberScore,
        })
        .where(eq(sessionFeedback.id, feedbackRow.id));
    } else {
      await tx.insert(sessionFeedback).values({
        organisationId: existing.organisationId,
        centreId: existing.centreId,
        sessionId: input.sessionId,
        notes: closure.notes,
        coachScore: closure.rpe,
        energy: closure.energy,
        memberScore: input.memberScore ?? null,
      });
    }

    await tx
      .update(memberPlans)
      .set({
        sessionsRemaining: sql`GREATEST(${memberPlans.sessionsRemaining} - 1, 0)`,
      })
      .where(and(eq(memberPlans.memberId, existing.memberId), eq(memberPlans.status, "active")));

    await publishEvent(tx, {
      organisationId: existing.organisationId,
      type: "SessionClosed",
      actorId: input.actor.userId,
      entityType: "session",
      entityId: input.sessionId,
      payload: {
        memberId: existing.memberId,
        rpe: closure.rpe,
        painFlag,
        energy: closure.energy,
      },
    });

    if (escalationReasons.length > 0 && existing.trainerId) {
      await createSessionEscalationTask(tx, {
        organisationId: existing.organisationId,
        centreId: existing.centreId,
        ownerId: existing.trainerId,
        sessionId: input.sessionId,
        memberId: existing.memberId,
        memberName: member?.name ?? "Client",
        reasons: escalationReasons,
        actorId: input.actor.userId,
      });
    }
  });

  await writeAudit(input.actor, "session.completed", "session", input.sessionId, {
    rpe: closure.rpe,
    painFlag,
    escalated: escalationReasons.length > 0,
  });

  return { ok: true as const, escalated: escalationReasons.length > 0 };
}
