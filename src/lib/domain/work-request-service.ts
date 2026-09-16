import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { assets, tasks, workRequests } from "@/db/schema";
import { publishEvent } from "@/lib/domain/publish-event";
import {
  assertWorkRequestTransition,
  InvalidStateTransitionError,
} from "@/lib/domain/state-machines";
import type { SessionPayload } from "@/lib/session";
import { centreInScope } from "@/lib/branch-scope";

export { InvalidStateTransitionError };

const SLA_HOURS: Record<string, number> = {
  urgent: 4,
  high: 24,
  normal: 48,
  low: 72,
};

export function computeSlaDueAt(priority: string, from = new Date()) {
  const hours = SLA_HOURS[priority] ?? SLA_HOURS.normal;
  return new Date(from.getTime() + hours * 3600000);
}

export type CreateWorkRequestInput = {
  centreId: string;
  assetId?: string;
  title: string;
  description?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  actor: SessionPayload;
};

export async function createWorkRequest(input: CreateWorkRequestInput) {
  const priority = input.priority ?? "normal";
  const slaDueAt = computeSlaDueAt(priority);

  const [row] = await db.transaction(async (tx) => {
    const [request] = await tx
      .insert(workRequests)
      .values({
        organisationId: input.actor.organisationId,
        centreId: input.centreId,
        assetId: input.assetId,
        title: input.title,
        description: input.description,
        priority,
        status: "submitted",
        requestedBy: input.actor.userId,
        slaDueAt,
      })
      .returning();

    if (input.assetId) {
      await tx
        .update(assets)
        .set({ status: "down" })
        .where(and(eq(assets.id, input.assetId), eq(assets.organisationId, input.actor.organisationId)));

      await publishEvent(tx, {
        organisationId: input.actor.organisationId,
        type: "EquipmentDown",
        actorId: input.actor.userId,
        entityType: "asset",
        entityId: input.assetId,
        payload: { workRequestId: request.id, title: input.title },
      });
    }

    await publishEvent(tx, {
      organisationId: input.actor.organisationId,
      type: "TaskCreated",
      actorId: input.actor.userId,
      entityType: "work_request",
      entityId: request.id,
      payload: { title: input.title, priority, status: "submitted" },
    });

    return [request];
  });

  return row;
}

export type UpdateWorkRequestInput = {
  workRequestId: string;
  actor: SessionPayload;
  status?: "approved" | "rejected" | "in_progress" | "completed" | "cancelled";
  assignedTo?: string;
  rejectionReason?: string;
};

function canApproveWorkRequest(role: SessionPayload["activeRole"]) {
  return role === "admin" || role === "centre_manager";
}

export async function updateWorkRequest(input: UpdateWorkRequestInput) {
  const [existing] = await db
    .select()
    .from(workRequests)
    .where(
      and(
        eq(workRequests.id, input.workRequestId),
        eq(workRequests.organisationId, input.actor.organisationId),
      ),
    )
    .limit(1);

  if (!existing) return { error: "Not found" as const };
  if (!centreInScope(input.actor, existing.centreId)) return { error: "Not found" as const };

  if (
    input.actor.activeRole === "trainer" &&
    existing.requestedBy !== input.actor.userId &&
    input.status !== "cancelled"
  ) {
    return { error: "Forbidden" as const };
  }

  if (
    (input.status === "approved" || input.status === "rejected") &&
    !canApproveWorkRequest(input.actor.activeRole)
  ) {
    return { error: "Only centre managers can approve or reject requests" as const };
  }

  const updates: Partial<typeof workRequests.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.assignedTo) updates.assignedTo = input.assignedTo;

  if (input.status && input.status !== existing.status) {
    try {
      assertWorkRequestTransition(existing.status, input.status);
    } catch (e) {
      if (e instanceof InvalidStateTransitionError) {
        return { error: e.message };
      }
      throw e;
    }
    updates.status = input.status;

    if (input.status === "approved") {
      updates.approvedBy = input.actor.userId;
      updates.approvedAt = new Date();
    }
    if (input.status === "rejected") {
      updates.rejectionReason = input.rejectionReason ?? "Rejected by approver";
    }
    if (input.status === "completed") {
      updates.completedAt = new Date();
    }
  }

  await db.transaction(async (tx) => {
    await tx.update(workRequests).set(updates).where(eq(workRequests.id, input.workRequestId));

    if (updates.status === "approved") {
      await publishEvent(tx, {
        organisationId: existing.organisationId,
        type: "RequestApproved",
        actorId: input.actor.userId,
        entityType: "work_request",
        entityId: existing.id,
        payload: { assetId: existing.assetId, assignedTo: input.assignedTo },
      });
    }

    if (updates.status === "completed") {
      await publishEvent(tx, {
        organisationId: existing.organisationId,
        type: "WorkOrderClosed",
        actorId: input.actor.userId,
        entityType: "work_request",
        entityId: existing.id,
        payload: { assetId: existing.assetId },
      });

      if (existing.assetId) {
        await tx
          .update(assets)
          .set({ status: "operational", lastServiceAt: new Date() })
          .where(eq(assets.id, existing.assetId));
      }
    }
  });

  return { ok: true as const };
}

export async function processOverdueWorkRequests(organisationId: string) {
  const now = new Date();
  const overdue = await db
    .select()
    .from(workRequests)
    .where(eq(workRequests.organisationId, organisationId));

  const active = overdue.filter(
    (r) =>
      ["submitted", "approved", "in_progress"].includes(r.status) && r.slaDueAt < now,
  );

  for (const request of active) {
    const triggerEvent = `work_request_sla:${request.id}`;
    const [existingTask] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.organisationId, organisationId),
          eq(tasks.triggerEvent, triggerEvent),
          eq(tasks.status, "open"),
        ),
      )
      .limit(1);

    if (existingTask) continue;

    const { roleAssignments } = await import("@/db/schema");
    const [manager] = await db
      .select({ userId: roleAssignments.userId })
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.organisationId, organisationId),
          eq(roleAssignments.centreId, request.centreId),
          eq(roleAssignments.role, "centre_manager"),
        ),
      )
      .limit(1);

    const ownerId = manager?.userId ?? request.requestedBy;

    await db.transaction(async (tx) => {
      const [task] = await tx
        .insert(tasks)
        .values({
          organisationId: request.organisationId,
          centreId: request.centreId,
          ownerId,
          title: `SLA overdue — ${request.title}`,
          description: `Work request passed SLA deadline (${request.priority} priority).`,
          status: "open",
          dueAt: now,
          triggerEvent,
        })
        .returning();

      await publishEvent(tx, {
        organisationId: request.organisationId,
        type: "TaskOverdue",
        actorId: ownerId,
        entityType: "work_request",
        entityId: request.id,
        payload: { taskId: task.id, slaDueAt: request.slaDueAt.toISOString() },
      });
    });
  }

  return active.length;
}
