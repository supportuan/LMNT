import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { sessionFeedback, sessions } from "@/db/schema";
import { assertSessionAccess } from "@/lib/access";
import { writeAudit } from "@/lib/audit";
import { closeSession } from "@/lib/domain/session-service";
import { assertSessionTransition, InvalidStateTransitionError } from "@/lib/domain/state-machines";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/policy";
import { getSession } from "@/lib/session";

const bodySchema = z.object({
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
  scheduledAt: z.string().datetime().optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  painFlag: z.boolean().optional(),
  notes: z.string().optional(),
  energy: z.string().optional(),
  memberScore: z.number().min(1).max(10).nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session || !hasPermission(session.activeRole, PERMISSIONS.SESSION_LOG)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await assertSessionAccess(session, id);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = bodySchema.parse(await request.json());

  const [existing] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.status === "completed") {
    const result = await closeSession({
      sessionId: id,
      actor: session,
      rpe: body.rpe,
      painFlag: body.painFlag,
      notes: body.notes,
      energy: body.energy,
      memberScore: body.memberScore,
    });

    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, escalated: result.escalated });
  }

  const updates: Partial<typeof sessions.$inferInsert> = {};

  if (body.status && body.status !== existing.status) {
    try {
      assertSessionTransition(existing.status, body.status);
    } catch (e) {
      if (e instanceof InvalidStateTransitionError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }
    updates.status = body.status;
  }

  if (body.scheduledAt) updates.scheduledAt = new Date(body.scheduledAt);
  if (body.rpe !== undefined) updates.rpe = body.rpe ?? undefined;
  if (body.painFlag !== undefined) updates.painFlag = body.painFlag;

  if (Object.keys(updates).length > 0) {
    await db.update(sessions).set(updates).where(eq(sessions.id, id));
  }

  if (body.notes !== undefined || body.energy !== undefined || body.memberScore !== undefined) {
    const [feedbackExisting] = await db
      .select()
      .from(sessionFeedback)
      .where(eq(sessionFeedback.sessionId, id))
      .limit(1);

    if (feedbackExisting) {
      await db
        .update(sessionFeedback)
        .set({
          notes: body.notes ?? feedbackExisting.notes,
          coachScore: body.rpe ?? feedbackExisting.coachScore,
          energy: body.energy ?? feedbackExisting.energy,
          memberScore: body.memberScore ?? feedbackExisting.memberScore,
        })
        .where(eq(sessionFeedback.id, feedbackExisting.id));
    } else if (body.notes || body.energy || body.rpe || body.memberScore) {
      await db.insert(sessionFeedback).values({
        organisationId: existing.organisationId,
        centreId: existing.centreId,
        sessionId: id,
        notes: body.notes,
        coachScore: body.rpe ?? null,
        energy: body.energy ?? null,
        memberScore: body.memberScore ?? null,
      });
    }
  }

  if (body.painFlag && !existing.painFlag) {
    await writeAudit(session, "session.pain_flagged", "session", id);
  }

  return NextResponse.json({ ok: true });
}
