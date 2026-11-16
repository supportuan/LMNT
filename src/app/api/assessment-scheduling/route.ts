import { and, desc, eq, gte, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assessments, leads, members, scheduleBlocks, sessions, users } from "@/db/schema";
import { assertMemberAccess } from "@/lib/access";
import { apiError, apiOk, requireApiSession, resolveCentreId } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { startOfWeek } from "@/lib/calendar-utils";
import { recordAllocationDecision } from "@/lib/domain/allocation";
import { publishEvent } from "@/lib/domain/publish-event";
import { PERMISSIONS } from "@/lib/permissions";
import { suggestTrainerSlots } from "@/lib/trainer-roster";

const createSchema = z.object({
  memberId: z.string().uuid(),
  trainerId: z.string().uuid(),
  scheduledAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/)),
  goals: z.string().min(1, "Goals required"),
});

const patchSchema = z.object({
  assessmentId: z.string().uuid(),
  trainerId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime().optional(),
  goals: z.string().optional(),
});

function parseWhen(value: string) {
  if (value.length === 10) return new Date(`${value}T00:00:00.000Z`);
  return new Date(value);
}

export async function GET(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CALENDAR_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const url = new URL(request.url);
  const trainerId = url.searchParams.get("trainerId");
  const weekParam = url.searchParams.get("weekStart");
  const listAll = url.searchParams.get("list") === "1";

  if (listAll) {
    const centreId = resolveCentreId(session, url.searchParams.get("centreId") ?? undefined);
    const condition = centreId
      ? and(
          eq(assessments.organisationId, session.organisationId),
          eq(assessments.centreId, centreId),
        )
      : eq(assessments.organisationId, session.organisationId);

    const rows = await db
      .select({
        id: assessments.id,
        memberId: assessments.memberId,
        memberName: members.name,
        trainerId: assessments.trainerId,
        trainerName: users.name,
        scheduledAt: assessments.scheduledAt,
        status: assessments.status,
        notes: assessments.notes,
        leadId: assessments.leadId,
        goal: members.goal,
      })
      .from(assessments)
      .innerJoin(members, eq(assessments.memberId, members.id))
      .leftJoin(users, eq(assessments.trainerId, users.id))
      .where(and(condition, gte(assessments.scheduledAt, new Date(0))))
      .orderBy(desc(assessments.scheduledAt))
      .limit(100);

    return apiOk({ assessments: rows.filter((r) => r.scheduledAt) });
  }

  if (!trainerId) return apiError("trainerId required", 400);

  const weekStart = weekParam ? startOfWeek(new Date(weekParam)) : startOfWeek(new Date());
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);

  const [blocks, busySessions, trainer] = await Promise.all([
    db
      .select({
        dayOfWeek: scheduleBlocks.dayOfWeek,
        timeSlot: scheduleBlocks.timeSlot,
        blockType: scheduleBlocks.blockType,
        label: scheduleBlocks.label,
        memberId: scheduleBlocks.memberId,
      })
      .from(scheduleBlocks)
      .where(
        and(
          eq(scheduleBlocks.organisationId, session.organisationId),
          eq(scheduleBlocks.trainerId, trainerId),
        ),
      ),
    db
      .select({ scheduledAt: sessions.scheduledAt })
      .from(sessions)
      .where(
        and(
          eq(sessions.trainerId, trainerId),
          gte(sessions.scheduledAt, weekStart),
          lt(sessions.scheduledAt, weekEnd),
          eq(sessions.status, "scheduled"),
        ),
      ),
    db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, trainerId)).limit(1),
  ]);

  const slots = suggestTrainerSlots(
    blocks.map((b) => ({ ...b, blockType: b.blockType })),
    busySessions,
    weekStart,
  );

  return apiOk({
    trainer: trainer[0] ?? null,
    weekStart: weekStart.toISOString(),
    blocks,
    slots,
  });
}

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

  try {
    await assertMemberAccess(session, body.memberId);
  } catch {
    return apiError("Member not found", 404);
  }

  const scheduledAt = parseWhen(body.scheduledAt);
  const [member] = await db.select().from(members).where(eq(members.id, body.memberId)).limit(1);
  if (!member) return apiError("Member not found", 404);

  const centreId = member.centreId;
  const whenLabel = scheduledAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const result = await db.transaction(async (tx) => {
    await tx
      .update(members)
      .set({ goal: body.goals.trim(), updatedAt: new Date() })
      .where(eq(members.id, member.id));

    const [lead] = await tx
      .insert(leads)
      .values({
        organisationId: session.organisationId,
        centreId,
        ownerId: body.trainerId,
        memberId: member.id,
        name: member.name,
        email: member.email,
        phone: member.phone,
        source: "assessment_schedule",
        stage: "consultation",
        notes: body.goals.trim(),
        nextAction: `Assessment · ${whenLabel}`,
      })
      .returning();

    await recordAllocationDecision(tx, {
      organisationId: session.organisationId,
      centreId,
      leadId: lead.id,
      ownerId: body.trainerId,
      reason: "assessment_scheduled",
    });

    const [assessment] = await tx
      .insert(assessments)
      .values({
        organisationId: session.organisationId,
        centreId,
        memberId: member.id,
        trainerId: body.trainerId,
        status: "draft",
        scheduledAt,
        leadId: lead.id,
        notes: body.goals.trim(),
      })
      .returning();

    const [sessionRow] = await tx
      .insert(sessions)
      .values({
        organisationId: session.organisationId,
        centreId,
        memberId: member.id,
        trainerId: body.trainerId,
        assessmentId: assessment.id,
        kind: "assessment",
        scheduledAt,
        status: "scheduled",
      })
      .returning();

    await publishEvent(tx, {
      organisationId: session.organisationId,
      type: "LeadAllocated",
      actorId: session.userId,
      entityType: "lead",
      entityId: lead.id,
      payload: {
        centreId,
        ownerId: body.trainerId,
        memberId: member.id,
        reason: "assessment_schedule",
      },
    });

    return { lead, assessment, session: sessionRow };
  });

  await writeAudit(session, "assessment.scheduled", "assessment", result.assessment.id, {
    trainerId: body.trainerId,
    leadId: result.lead.id,
  });

  return apiOk({
    ok: true,
    output: "Assessment scheduled — lead sent to trainer",
    ...result,
  });
}

export async function PATCH(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_CREATE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = patchSchema.parse(await request.json());

  const [existing] = await db
    .select()
    .from(assessments)
    .where(eq(assessments.id, body.assessmentId))
    .limit(1);
  if (!existing || !existing.scheduledAt) return apiError("Assessment schedule not found", 404);

  try {
    await assertMemberAccess(session, existing.memberId);
  } catch {
    return apiError("Not found", 404);
  }

  const scheduledAt = body.scheduledAt ? parseWhen(body.scheduledAt) : existing.scheduledAt;
  const trainerId = body.trainerId ?? existing.trainerId;
  if (!trainerId) return apiError("Trainer required", 400);

  const whenLabel = scheduledAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  await db.transaction(async (tx) => {
    if (body.goals?.trim()) {
      await tx
        .update(members)
        .set({ goal: body.goals.trim(), updatedAt: new Date() })
        .where(eq(members.id, existing.memberId));
    }

    await tx
      .update(assessments)
      .set({
        trainerId,
        scheduledAt,
        notes: body.goals?.trim() ?? existing.notes,
      })
      .where(eq(assessments.id, existing.id));

    if (existing.leadId) {
      const leadUpdates: Partial<typeof leads.$inferInsert> = {
        ownerId: trainerId,
        updatedAt: new Date(),
        nextAction: `Assessment · ${whenLabel}`,
      };
      if (body.goals?.trim()) {
        leadUpdates.notes = body.goals.trim();
      }
      await tx.update(leads).set(leadUpdates).where(eq(leads.id, existing.leadId));

      if (body.trainerId && body.trainerId !== existing.trainerId) {
        await recordAllocationDecision(tx, {
          organisationId: session.organisationId,
          centreId: existing.centreId,
          leadId: existing.leadId,
          ownerId: trainerId,
          reason: "assessment_reassigned",
        });
      }
    }

    await tx
      .update(sessions)
      .set({
        trainerId,
        scheduledAt,
      })
      .where(
        and(
          eq(sessions.assessmentId, existing.id),
          eq(sessions.status, "scheduled"),
        ),
      );
  });

  await writeAudit(session, "assessment.rescheduled", "assessment", existing.id, {
    trainerId,
    scheduledAt: scheduledAt.toISOString(),
  });

  return apiOk({ ok: true, output: "Assessment updated" });
}