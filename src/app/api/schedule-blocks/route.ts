import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { scheduleBlocks } from "@/db/schema";
import { assertMemberAccess } from "@/lib/access";
import { apiError, apiOk, centreIdForSession, requireApiSession } from "@/lib/api-helpers";
import { releaseRhythmSessions, syncRhythmSessions } from "@/lib/coach-life/rhythm";
import { BLOCK_TYPES } from "@/lib/coach-life/timetable";
import { PERMISSIONS } from "@/lib/permissions";
import { getScheduleBlocks } from "@/modules/trainer-queries";

const blockTypeSchema = z.enum(["client", "deep_work", "admin", "life", "shutdown"]);

const upsertSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    timeSlot: z.string().min(1).max(40),
    blockType: blockTypeSchema,
    label: z.string().trim().max(80).optional(),
    memberId: z.string().uuid().nullable().optional(),
    repeatDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  })
  .refine((b) => b.blockType !== "client" || Boolean(b.memberId), {
    message: "Choose a client for this slot",
    path: ["memberId"],
  });

const patchSchema = z.object({
  id: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  timeSlot: z.string().min(1).max(40).optional(),
  blockType: blockTypeSchema.optional(),
  label: z.string().trim().min(1).max(80).optional(),
  memberId: z.string().uuid().nullable().optional(),
});

function zodMessage(err: unknown) {
  return err instanceof z.ZodError ? err.issues.map((i) => i.message).join("; ") : "Invalid request";
}

export async function GET() {
  const { error, session } = await requireApiSession(PERMISSIONS.CALENDAR_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const blocks = await getScheduleBlocks(session);
  return apiOk({ blocks });
}

/** Create or replace the block in a slot, optionally repeating it on other days at the same time. */
export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CALENDAR_EDIT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const centreId = centreIdForSession(session);
  if (!centreId) return apiError("No centre assigned", 400);

  let body: z.infer<typeof upsertSchema>;
  try {
    body = upsertSchema.parse(await request.json());
  } catch (err) {
    return apiError(zodMessage(err), 400);
  }

  const memberId = body.blockType === "client" ? (body.memberId ?? null) : null;
  if (memberId) {
    try {
      await assertMemberAccess(session, memberId);
    } catch {
      return apiError("Client not found", 404);
    }
  }

  const label =
    body.label?.trim() ||
    BLOCK_TYPES.find((t) => t.value === body.blockType)?.defaultLabel ||
    "Block";
  const days = [...new Set([body.dayOfWeek, ...(body.repeatDays ?? [])])];

  const previous = await db
    .select()
    .from(scheduleBlocks)
    .where(
      and(
        eq(scheduleBlocks.trainerId, session.userId),
        eq(scheduleBlocks.timeSlot, body.timeSlot),
        inArray(scheduleBlocks.dayOfWeek, days),
      ),
    );

  for (const prev of previous) {
    if (prev.blockType === "client" && prev.memberId && prev.memberId !== memberId) {
      await releaseRhythmSessions(session, prev);
    }
  }

  const saved = [];
  for (const dayOfWeek of days) {
    const [row] = await db
      .insert(scheduleBlocks)
      .values({
        organisationId: session.organisationId,
        centreId,
        trainerId: session.userId,
        dayOfWeek,
        timeSlot: body.timeSlot,
        blockType: body.blockType,
        label,
        memberId,
      })
      .onConflictDoUpdate({
        target: [scheduleBlocks.trainerId, scheduleBlocks.dayOfWeek, scheduleBlocks.timeSlot],
        set: { blockType: body.blockType, label, memberId },
      })
      .returning();
    saved.push(row);
  }

  const rhythm = memberId ? await syncRhythmSessions(session) : { created: 0 };
  return apiOk({ blocks: saved, sessionsCreated: rhythm.created });
}

export async function PATCH(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CALENDAR_EDIT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await request.json());
  } catch (err) {
    return apiError(zodMessage(err), 400);
  }

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
  if (existing.blockType === "client") await releaseRhythmSessions(session, existing);
  await syncRhythmSessions(session);
  return apiOk({});
}

export async function DELETE(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CALENDAR_EDIT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return apiError("Missing id", 400);

  const [existing] = await db
    .select()
    .from(scheduleBlocks)
    .where(and(eq(scheduleBlocks.id, id), eq(scheduleBlocks.trainerId, session.userId)))
    .limit(1);
  if (!existing) return apiError("Not found", 404);

  await db.delete(scheduleBlocks).where(eq(scheduleBlocks.id, id));
  const released = existing.blockType === "client" ? await releaseRhythmSessions(session, existing) : { cancelled: 0 };
  return apiOk({ sessionsCancelled: released.cancelled });
}
