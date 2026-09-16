import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { scheduleBlocks } from "@/db/schema";
import { apiError, apiOk, centreIdForSession, requireApiSession } from "@/lib/api-helpers";
import { PERMISSIONS } from "@/lib/permissions";
import { getScheduleBlocks } from "@/modules/trainer-queries";

const createSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  timeSlot: z.string().min(1),
  blockType: z.enum(["client", "deep_work", "admin", "life", "shutdown"]),
  label: z.string().min(1),
  memberId: z.string().uuid().optional(),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  dayOfWeek: z.number().min(0).max(6).optional(),
  timeSlot: z.string().min(1).optional(),
  blockType: z.enum(["client", "deep_work", "admin", "life", "shutdown"]).optional(),
  label: z.string().min(1).optional(),
  memberId: z.string().uuid().nullable().optional(),
});

export async function GET() {
  const { error, session } = await requireApiSession(PERMISSIONS.CALENDAR_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const blocks = await getScheduleBlocks(session);
  return apiOk({ blocks });
}

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CALENDAR_EDIT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const centreId = centreIdForSession(session);
  if (!centreId) return apiError("No centre assigned", 400);

  const body = createSchema.parse(await request.json());

  const [block] = await db
    .insert(scheduleBlocks)
    .values({
      organisationId: session.organisationId,
      centreId,
      trainerId: session.userId,
      dayOfWeek: body.dayOfWeek,
      timeSlot: body.timeSlot,
      blockType: body.blockType,
      label: body.label,
      memberId: body.memberId,
    })
    .returning();

  return apiOk({ block });
}

export async function PATCH(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CALENDAR_EDIT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = patchSchema.parse(await request.json());

  const [existing] = await db
    .select()
    .from(scheduleBlocks)
    .where(and(eq(scheduleBlocks.id, body.id), eq(scheduleBlocks.trainerId, session.userId)))
    .limit(1);

  if (!existing) return apiError("Not found", 404);

  const updates: Partial<typeof scheduleBlocks.$inferInsert> = {};
  if (body.dayOfWeek !== undefined) updates.dayOfWeek = body.dayOfWeek;
  if (body.timeSlot !== undefined) updates.timeSlot = body.timeSlot;
  if (body.blockType !== undefined) updates.blockType = body.blockType;
  if (body.label !== undefined) updates.label = body.label;
  if (body.memberId !== undefined) updates.memberId = body.memberId;

  await db.update(scheduleBlocks).set(updates).where(eq(scheduleBlocks.id, body.id));
  return apiOk({});
}

export async function DELETE(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CALENDAR_EDIT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return apiError("Missing id", 400);

  await db
    .delete(scheduleBlocks)
    .where(and(eq(scheduleBlocks.id, id), eq(scheduleBlocks.trainerId, session.userId)));

  return apiOk({});
}
