import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { orgAndCentreScope } from "@/lib/branch-scope";
import { apiError, apiOk, centreIdForSession, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { publishEvent } from "@/lib/domain/publish-event";
import { PERMISSIONS } from "@/lib/permissions";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueAt: z.string().datetime(),
  triggerEvent: z.string().optional(),
});

export async function GET(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CALENDAR_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let condition = orgAndCentreScope(session, tasks.organisationId, tasks.centreId)!;

  if (session.activeRole === "trainer") {
    condition = and(condition, eq(tasks.ownerId, session.userId))!;
  }

  if (status) {
    const statuses = status.split(",").filter(Boolean) as Array<
      "open" | "in_progress" | "completed" | "cancelled"
    >;
    if (statuses.length > 0) {
      condition = and(condition, inArray(tasks.status, statuses))!;
    }
  }

  const rows = await db
    .select()
    .from(tasks)
    .where(condition)
    .orderBy(desc(tasks.dueAt))
    .limit(100);

  return apiOk({ tasks: rows });
}

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CALENDAR_EDIT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const centreId = centreIdForSession(session);
  if (!centreId) return apiError("No centre assigned", 400);

  const body = createSchema.parse(await request.json());

  const task = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(tasks)
      .values({
        organisationId: session.organisationId,
        centreId,
        ownerId: session.userId,
        title: body.title,
        description: body.description,
        dueAt: new Date(body.dueAt),
        status: "open",
        triggerEvent: body.triggerEvent,
      })
      .returning();

    await publishEvent(tx, {
      organisationId: session.organisationId,
      type: "TaskCreated",
      actorId: session.userId,
      entityType: "task",
      entityId: row.id,
      payload: {
        title: row.title,
        dueAt: row.dueAt?.toISOString(),
        triggerEvent: row.triggerEvent,
      },
    });

    return row;
  });

  await writeAudit(session, "task.created", "task", task.id);
  return apiOk({ task });
}
