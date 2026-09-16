import { and, eq, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  assets,
  automationRules,
  inventoryItems,
  roleAssignments,
  tasks,
} from "@/db/schema";
import { publishEvent } from "@/lib/domain/publish-event";

const DEFAULT_RULES = [
  {
    ruleType: "asset_maintenance_due" as const,
    name: "Asset maintenance due",
    cadenceDays: 1,
    taskTitle: "Schedule asset maintenance",
    taskDescription: "One or more assets are past their maintenance date.",
  },
  {
    ruleType: "inventory_low" as const,
    name: "Low inventory reorder",
    cadenceDays: 1,
    taskTitle: "Restock low inventory items",
    taskDescription: "Consumables have fallen below reorder level.",
  },
  {
    ruleType: "hygiene_weekly" as const,
    name: "Weekly floor hygiene walkthrough",
    cadenceDays: 7,
    taskTitle: "Floor hygiene walkthrough",
    taskDescription: "Complete the weekly equipment wipe-down and floor safety check.",
  },
];

async function resolveOwnerId(organisationId: string, centreId: string, role: "centre_manager" | "trainer") {
  const [row] = await db
    .select({ userId: roleAssignments.userId })
    .from(roleAssignments)
    .where(
      and(
        eq(roleAssignments.organisationId, organisationId),
        eq(roleAssignments.centreId, centreId),
        eq(roleAssignments.role, role),
      ),
    )
    .limit(1);
  return row?.userId ?? null;
}

async function ensureDefaultRules(organisationId: string, centreId: string) {
  const existing = await db
    .select({ id: automationRules.id })
    .from(automationRules)
    .where(
      and(eq(automationRules.organisationId, organisationId), eq(automationRules.centreId, centreId)),
    )
    .limit(1);

  if (existing.length > 0) return;

  await db.insert(automationRules).values(
    DEFAULT_RULES.map((rule) => ({
      organisationId,
      centreId,
      name: rule.name,
      ruleType: rule.ruleType,
      cadenceDays: rule.cadenceDays,
      taskTitle: rule.taskTitle,
      taskDescription: rule.taskDescription,
      ownerRole: "centre_manager" as const,
      active: true,
    })),
  );
}

async function hasOpenTask(organisationId: string, triggerEvent: string) {
  const [row] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.organisationId, organisationId),
        eq(tasks.triggerEvent, triggerEvent),
        inArray(tasks.status, ["open", "in_progress"]),
      ),
    )
    .limit(1);
  return Boolean(row);
}

async function createHygieneTask(input: {
  organisationId: string;
  centreId: string;
  ownerId: string;
  title: string;
  description?: string;
  triggerEvent: string;
  actorId: string;
}) {
  if (await hasOpenTask(input.organisationId, input.triggerEvent)) return null;

  const dueAt = new Date(Date.now() + 24 * 3600000);

  const [task] = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(tasks)
      .values({
        organisationId: input.organisationId,
        centreId: input.centreId,
        ownerId: input.ownerId,
        title: input.title,
        description: input.description,
        status: "open",
        dueAt,
        triggerEvent: input.triggerEvent,
      })
      .returning();

    await publishEvent(tx, {
      organisationId: input.organisationId,
      type: "TaskCreated",
      actorId: input.actorId,
      entityType: "task",
      entityId: row.id,
      payload: { triggerEvent: input.triggerEvent, automation: true },
    });

    return [row];
  });

  return task;
}

export async function runHygieneAutomation(input: {
  organisationId: string;
  centreId: string;
  actorId: string;
}) {
  await ensureDefaultRules(input.organisationId, input.centreId);

  const rules = await db
    .select()
    .from(automationRules)
    .where(
      and(
        eq(automationRules.organisationId, input.organisationId),
        eq(automationRules.centreId, input.centreId),
        eq(automationRules.active, true),
      ),
    );

  const ownerId =
    (await resolveOwnerId(input.organisationId, input.centreId, "centre_manager")) ?? input.actorId;

  const now = new Date();
  let tasksCreated = 0;

  for (const rule of rules) {
    if (rule.lastRunAt) {
      const nextRun = new Date(rule.lastRunAt.getTime() + rule.cadenceDays * 86400000);
      if (nextRun > now) continue;
    }

    if (rule.ruleType === "asset_maintenance_due") {
      const dueAssets = await db
        .select({ id: assets.id, name: assets.name })
        .from(assets)
        .where(
          and(
            eq(assets.organisationId, input.organisationId),
            eq(assets.centreId, input.centreId),
            lte(assets.nextMaintenanceAt, now),
          ),
        )
        .limit(5);

      if (dueAssets.length > 0) {
        const task = await createHygieneTask({
          organisationId: input.organisationId,
          centreId: input.centreId,
          ownerId,
          title: rule.taskTitle,
          description: `${rule.taskDescription} Affected: ${dueAssets.map((a) => a.name).join(", ")}.`,
          triggerEvent: `automation:${rule.ruleType}:${input.centreId}`,
          actorId: input.actorId,
        });
        if (task) tasksCreated++;
      }
    }

    if (rule.ruleType === "inventory_low") {
      const lowItems = await db
        .select({
          id: inventoryItems.id,
          name: inventoryItems.name,
          quantity: inventoryItems.quantity,
          reorderLevel: inventoryItems.reorderLevel,
        })
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.organisationId, input.organisationId),
            eq(inventoryItems.centreId, input.centreId),
          ),
        );

      const needsReorder = lowItems.filter((item) => item.quantity <= item.reorderLevel);
      if (needsReorder.length > 0) {
        const task = await createHygieneTask({
          organisationId: input.organisationId,
          centreId: input.centreId,
          ownerId,
          title: rule.taskTitle,
          description: `${rule.taskDescription} Low: ${needsReorder.map((i) => i.name).join(", ")}.`,
          triggerEvent: `automation:${rule.ruleType}:${input.centreId}`,
          actorId: input.actorId,
        });
        if (task) tasksCreated++;
      }
    }

    if (rule.ruleType === "hygiene_weekly") {
      const task = await createHygieneTask({
        organisationId: input.organisationId,
        centreId: input.centreId,
        ownerId,
        title: rule.taskTitle,
        description: rule.taskDescription ?? undefined,
        triggerEvent: `automation:${rule.ruleType}:${input.centreId}:${now.toISOString().slice(0, 10)}`,
        actorId: input.actorId,
      });
      if (task) tasksCreated++;
    }

    await db
      .update(automationRules)
      .set({ lastRunAt: now })
      .where(eq(automationRules.id, rule.id));
  }

  return { tasksCreated, rulesProcessed: rules.length };
}
