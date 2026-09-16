import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  coachMatchInteractions,
  coachingRelationships,
  leads,
  memberPlans,
  members,
  onboardingAssignments,
} from "@/db/schema";
import { canAccessLead } from "@/lib/access";
import { apiError, apiOk, centreIdForSession, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { recordAllocationDecision } from "@/lib/domain/allocation";
import { publishEvent } from "@/lib/domain/publish-event";
import {
  assertLeadTransition,
  InvalidStateTransitionError,
} from "@/lib/domain/state-machines";
import { PERMISSIONS } from "@/lib/permissions";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  stage: z.enum(["new", "contacted", "consultation", "trial", "won", "lost"]).optional(),
  notes: z.string().optional(),
  nextAction: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  allocationReason: z.string().optional(),
  convert: z.boolean().optional(),
});

function canReassignLeadOwner(
  role: string,
  sessionUserId: string,
  currentOwnerId: string | null,
  newOwnerId: string,
) {
  if (newOwnerId === currentOwnerId) return true;
  if (role === "admin" || role === "centre_manager") return true;
  if (role === "trainer") {
    return newOwnerId === sessionUserId && (currentOwnerId == null || currentOwnerId === sessionUserId);
  }
  return false;
}

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.LEAD_CREATE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const centreId = centreIdForSession(session);
  if (!centreId) return apiError("No centre assigned", 400);

  const body = createSchema.parse(await request.json());

  const lead = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(leads)
      .values({
        organisationId: session.organisationId,
        centreId,
        ownerId: session.userId,
        name: body.name,
        email: body.email,
        phone: body.phone,
        source: body.source ?? "walk_in",
        notes: body.notes,
        stage: "new",
      })
      .returning();

    await recordAllocationDecision(tx, {
      organisationId: session.organisationId,
      centreId,
      leadId: row.id,
      ownerId: session.userId,
      reason: "lead_created",
      ruleVersion: "self_assign_v1",
    });

    await publishEvent(tx, {
      organisationId: session.organisationId,
      type: "LeadCreated",
      actorId: session.userId,
      entityType: "lead",
      entityId: row.id,
      payload: {
        centreId,
        ownerId: session.userId,
        stage: "new",
        source: body.source ?? "walk_in",
      },
    });

    return row;
  });

  await writeAudit(session, "lead.created", "lead", lead.id);
  return apiOk({ lead });
}

export async function PATCH(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.LEAD_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = patchSchema.parse(await request.json());

  if (!(await canAccessLead(session, body.id))) {
    return apiError("Not found", 404);
  }

  const [lead] = await db.select().from(leads).where(eq(leads.id, body.id)).limit(1);
  if (!lead) return apiError("Not found", 404);

  if (body.convert) {
    const member = await db.transaction(async (tx) => {
      const centreId = lead.centreId;
      const trainerId = lead.ownerId ?? session.userId;

      let created = null as typeof members.$inferSelect | null;
      if (lead.source === "coach_match" && lead.email) {
        const [existingMember] = await tx
          .select()
          .from(members)
          .where(
            and(eq(members.organisationId, lead.organisationId), eq(members.email, lead.email)),
          )
          .limit(1);
        if (existingMember) created = existingMember;
      }

      if (!created) {
        [created] = await tx
          .insert(members)
          .values({
            organisationId: lead.organisationId,
            centreId,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            status: "active",
          })
          .returning();
      }

      if (session.activeRole === "trainer" || lead.ownerId) {
        const [existingRel] = await tx
          .select()
          .from(coachingRelationships)
          .where(
            and(
              eq(coachingRelationships.memberId, created.id),
              eq(coachingRelationships.trainerId, trainerId),
            ),
          )
          .limit(1);

        if (!existingRel) {
          await tx.insert(coachingRelationships).values({
            organisationId: lead.organisationId,
            centreId,
            memberId: created.id,
            trainerId,
            active: true,
            source: lead.source === "coach_match" ? "coach_match" : "manual",
            matchStatus: lead.source === "coach_match" ? "active" : "active",
          });
        }
      }

      if (lead.source === "coach_match" && trainerId) {
        await tx
          .update(coachMatchInteractions)
          .set({ status: "matched", updatedAt: new Date() })
          .where(
            and(
              eq(coachMatchInteractions.memberId, created.id),
              eq(coachMatchInteractions.trainerId, trainerId),
            ),
          );
      }

      await tx.insert(memberPlans).values({
        organisationId: lead.organisationId,
        centreId,
        memberId: created.id,
        planName: "New client package",
        status: "active",
        totalSessions: 12,
        sessionsRemaining: 12,
        packageValue: 0,
        amountDue: 0,
        startsAt: new Date(),
      });

      await tx.insert(onboardingAssignments).values({
        organisationId: lead.organisationId,
        centreId,
        memberId: created.id,
        trainerId,
        status: "pending",
        dueAt: new Date(Date.now() + 7 * 86400000),
        checklist: [
          { item: "PAR-Q and readiness assessment", done: false },
          { item: "Goal setting consultation", done: false },
          { item: "Movement screen", done: false },
          { item: "First programme assignment", done: false },
          { item: "App walkthrough and check-in demo", done: false },
        ],
      });

      await tx
        .update(leads)
        .set({ stage: "won", convertedMemberId: created.id, updatedAt: new Date() })
        .where(eq(leads.id, body.id));

      await publishEvent(tx, {
        organisationId: lead.organisationId,
        type: "LeadConverted",
        actorId: session.userId,
        entityType: "lead",
        entityId: lead.id,
        payload: {
          memberId: created.id,
          trainerId,
          previousStage: lead.stage,
        },
      });

      return created;
    });

    await writeAudit(session, "lead.converted", "lead", body.id, { memberId: member.id });
    return apiOk({ member });
  }

  const updates: Partial<typeof leads.$inferInsert> = { updatedAt: new Date() };
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.nextAction !== undefined) updates.nextAction = body.nextAction;

  if (body.stage && body.stage !== lead.stage) {
    try {
      assertLeadTransition(lead.stage, body.stage);
    } catch (e) {
      if (e instanceof InvalidStateTransitionError) {
        return apiError(e.message, 400);
      }
      throw e;
    }
    updates.stage = body.stage;
  }

  if (body.ownerId && body.ownerId !== lead.ownerId) {
    if (!canReassignLeadOwner(session.activeRole, session.userId, lead.ownerId, body.ownerId)) {
      return apiError("Cannot reassign lead owner", 403);
    }
    updates.ownerId = body.ownerId;
  }

  await db.transaction(async (tx) => {
    if (updates.stage) {
      await publishEvent(tx, {
        organisationId: lead.organisationId,
        type: "LeadStageChanged",
        actorId: session.userId,
        entityType: "lead",
        entityId: lead.id,
        payload: {
          from: lead.stage,
          to: updates.stage,
        },
      });
    }

    if (body.ownerId && body.ownerId !== lead.ownerId) {
      await recordAllocationDecision(tx, {
        organisationId: lead.organisationId,
        centreId: lead.centreId,
        leadId: lead.id,
        ownerId: body.ownerId,
        reason: body.allocationReason ?? "manual_reassignment",
        ruleVersion: "manual_v1",
      });

      await publishEvent(tx, {
        organisationId: lead.organisationId,
        type: "LeadAllocated",
        actorId: session.userId,
        entityType: "lead",
        entityId: lead.id,
        payload: {
          previousOwnerId: lead.ownerId,
          ownerId: body.ownerId,
          reason: body.allocationReason ?? "manual_reassignment",
          ruleVersion: "manual_v1",
        },
      });
    }

    await tx.update(leads).set(updates).where(eq(leads.id, body.id));
  });

  await writeAudit(session, "lead.updated", "lead", body.id, {
    stage: updates.stage,
    ownerId: updates.ownerId,
  });
  return apiOk({});
}
