import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { programmes } from "@/db/schema";
import { assertMemberAccess } from "@/lib/access";
import { apiError, apiOk, centreIdForSession, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { AssessmentGateError, assertProgrammePublishAllowed } from "@/lib/domain/assessment-gate";
import { publishEvent } from "@/lib/domain/publish-event";
import type { WeekPlan } from "@/lib/coach-pro/engine";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/policy";

const exerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  pattern: z.string(),
  prescription: z.string(),
  targetReps: z.string(),
});

const contentSchema = z.object({
  markdown: z.string().optional(),
  weeks: z.array(
    z.object({
      week: z.number(),
      label: z.string(),
      days: z.array(
        z.object({
          key: z.string(),
          label: z.string(),
          exercises: z.array(exerciseSchema),
        }),
      ),
    }),
  ).optional(),
  goal: z.string().optional(),
  daysPerWeek: z.number().optional(),
});

const createSchema = z.object({
  memberId: z.string().uuid(),
  title: z.string().min(1),
  content: contentSchema.optional(),
  status: z.enum(["draft", "active", "completed", "paused"]).optional(),
});

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.PROGRAM_CREATE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const centreId = centreIdForSession(session);
  if (!centreId) return apiError("No centre assigned", 400);

  const body = createSchema.parse(await request.json());
  try {
    await assertMemberAccess(session, body.memberId);
  } catch {
    return apiError("Not found", 404);
  }

  const [programme] = await db
    .insert(programmes)
    .values({
      organisationId: session.organisationId,
      centreId,
      memberId: body.memberId,
      trainerId: session.userId,
      title: body.title,
      status: body.status ?? "draft",
      content: body.content as { markdown?: string; weeks?: WeekPlan[]; goal?: string; daysPerWeek?: number },
      startsAt: body.status === "active" ? new Date() : null,
    })
    .returning();

  await writeAudit(session, "programme.created", "programme", programme.id);
  return apiOk({ programme });
}

export async function PATCH(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.PROGRAM_EDIT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = z
    .object({
      id: z.string().uuid(),
      title: z.string().optional(),
      content: contentSchema.optional(),
      status: z.enum(["draft", "active", "completed", "paused"]).optional(),
      publish: z.boolean().optional(),
    })
    .parse(await request.json());

  const [existing] = await db
    .select()
    .from(programmes)
    .where(eq(programmes.id, body.id))
    .limit(1);
  if (!existing) return apiError("Not found", 404);

  try {
    await assertMemberAccess(session, existing.memberId);
  } catch {
    return apiError("Not found", 404);
  }

  const updates: Partial<typeof programmes.$inferInsert> = {};
  if (body.title) updates.title = body.title;
  if (body.content) updates.content = body.content as typeof existing.content;

  if (body.publish || body.status === "active") {
    if (!hasPermission(session.activeRole, PERMISSIONS.PROGRAM_PUBLISH)) {
      return apiError("Forbidden", 403);
    }

    try {
      await assertProgrammePublishAllowed(existing.memberId);
    } catch (e) {
      if (e instanceof AssessmentGateError) {
        return apiError(e.message, 400);
      }
      throw e;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(programmes)
        .set({ status: "paused" })
        .where(
          and(eq(programmes.memberId, existing.memberId), eq(programmes.status, "active")),
        );

      await tx.update(programmes).set({ ...updates, status: "active", startsAt: new Date() }).where(eq(programmes.id, body.id));

      await publishEvent(tx, {
        organisationId: session.organisationId,
        type: "ProgrammeAssigned",
        actorId: session.userId,
        entityType: "programme",
        entityId: body.id,
        payload: { memberId: existing.memberId, title: existing.title },
      });
    });

    await writeAudit(session, "programme.published", "programme", body.id);
    return apiOk({});
  } else if (body.status) {
    updates.status = body.status;
  }

  await db.update(programmes).set(updates).where(eq(programmes.id, body.id));
  await writeAudit(session, "programme.updated", "programme", body.id);
  return apiOk({});
}
