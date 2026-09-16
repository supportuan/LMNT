import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { assertTaskTransition, InvalidStateTransitionError } from "@/lib/domain/state-machines";
import { publishEvent } from "@/lib/domain/publish-event";
import { orgAndCentreScope } from "@/lib/branch-scope";
import { PERMISSIONS } from "@/lib/permissions";

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
  dueAt: z.string().datetime().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

async function loadTask(session: Awaited<ReturnType<typeof requireApiSession>>["session"], id: string) {
  if (!session) return null;

  let condition = and(
    eq(tasks.id, id),
    orgAndCentreScope(session, tasks.organisationId, tasks.centreId),
  )!;

  if (session.activeRole === "trainer") {
    condition = and(condition, eq(tasks.ownerId, session.userId))!;
  }

  const [row] = await db.select().from(tasks).where(condition).limit(1);
  return row ?? null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { error, session } = await requireApiSession(PERMISSIONS.CALENDAR_EDIT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const { id } = await context.params;
  const body = patchSchema.parse(await request.json());

  const existing = await loadTask(session, id);
  if (!existing) return apiError("Not found", 404);

  if (body.status && body.status !== existing.status) {
    try {
      assertTaskTransition(existing.status, body.status);
    } catch (e) {
      if (e instanceof InvalidStateTransitionError) {
        return apiError(e.message, 400);
      }
      throw e;
    }
  }

  const updates: Partial<typeof tasks.$inferInsert> = {};
  if (body.title) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.status) updates.status = body.status;
  if (body.dueAt) updates.dueAt = new Date(body.dueAt);

  const [task] = await db.transaction(async (tx) => {
    const [row] = await tx.update(tasks).set(updates).where(eq(tasks.id, id)).returning();

    if (body.status === "completed" && existing.status !== "completed") {
      await publishEvent(tx, {
        organisationId: session.organisationId,
        type: "TaskCompleted",
        actorId: session.userId,
        entityType: "task",
        entityId: id,
        payload: { title: row.title, triggerEvent: row.triggerEvent },
      });
    }

    return [row];
  });

  await writeAudit(session, "task.updated", "task", id, { status: task.status });
  return apiOk({ task });
}
