import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { scheduleBlocks, sessions } from "@/db/schema";
import { DEFAULT_SESSION_MINS } from "@/lib/calendar-utils";
import type { SessionPayload } from "@/lib/session";
import { getScheduleBlocks } from "@/modules/trainer-queries";

const DAY_MAP: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

/** Parse "Mon, Wed, Fri" into day-of-week indices (0 = Sun). */
export function parseTrainingDays(trainingDays: string | null | undefined): number[] {
  if (!trainingDays?.trim()) return [];
  const seen = new Set<number>();
  for (const part of trainingDays.split(/[,;]+/)) {
    const key = part.trim().slice(0, 3).toLowerCase();
    const day = DAY_MAP[key];
    if (day !== undefined) seen.add(day);
  }
  return [...seen];
}

function parseHourToken(token: string): number | null {
  const cleaned = token.trim().toLowerCase().replace(/\s/g, "");
  const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const mins = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3];
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (!meridiem && hour <= 7) hour += 12;
  return hour * 60 + mins;
}

/** Parse slots like "3–4pm", "3-4 pm", or "15:00-16:00". */
export function parseTimeSlotToMinutes(
  timeSlot: string,
): { start: number; end: number } | null {
  const normalized = timeSlot.replace(/[–—]/g, "-").trim();
  const parts = normalized.split("-").map((p) => p.trim());
  if (parts.length !== 2) return null;

  const endHasMeridiem = /am|pm/i.test(parts[1]);
  const startHasMeridiem = /am|pm/i.test(parts[0]);
  if (!startHasMeridiem && endHasMeridiem) {
    parts[0] = `${parts[0]}${parts[1].match(/(am|pm)/i)?.[0] ?? ""}`;
  }

  const start = parseHourToken(parts[0]);
  const end = parseHourToken(parts[1]);
  if (start == null || end == null || end <= start) return null;
  return { start, end };
}

export function sessionOverlapsBlock(
  scheduledAt: Date,
  block: { dayOfWeek: number; timeSlot: string },
  durationMins = DEFAULT_SESSION_MINS,
): boolean {
  if (scheduledAt.getDay() !== block.dayOfWeek) return false;
  const range = parseTimeSlotToMinutes(block.timeSlot);
  if (!range) return false;
  const sessionStart = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();
  const sessionEnd = sessionStart + durationMins;
  return sessionStart < range.end && sessionEnd > range.start;
}

export type LifeBlockConflict = {
  sessionId: string;
  memberName: string;
  scheduledAt: string;
  blockLabel: string;
  timeSlot: string;
};

export async function getTrainerLifeConflicts(
  session: SessionPayload,
): Promise<LifeBlockConflict[]> {
  const blocks = await getScheduleBlocks(session);
  const protectedBlocks = blocks.filter(
    (b) => b.blockType === "life" || b.blockType === "shutdown",
  );
  if (protectedBlocks.length === 0) return [];

  const now = new Date();
  const { members } = await import("@/db/schema");
  const rows = await db
    .select({
      id: sessions.id,
      scheduledAt: sessions.scheduledAt,
      status: sessions.status,
      memberName: members.name,
    })
    .from(sessions)
    .innerJoin(members, eq(sessions.memberId, members.id))
    .where(
      and(
        eq(sessions.trainerId, session.userId),
        eq(sessions.organisationId, session.organisationId),
      ),
    );

  const conflicts: LifeBlockConflict[] = [];
  for (const row of rows) {
    if (row.status === "completed" || row.status === "cancelled") continue;
    if (row.scheduledAt < now) continue;
    for (const block of protectedBlocks) {
      if (sessionOverlapsBlock(row.scheduledAt, block)) {
        conflicts.push({
          sessionId: row.id,
          memberName: row.memberName,
          scheduledAt: row.scheduledAt.toISOString(),
          blockLabel: block.label,
          timeSlot: block.timeSlot,
        });
        break;
      }
    }
  }

  return conflicts.sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );
}

export async function syncLifeBlocksFromSettings(
  session: SessionPayload,
  settings: {
    trainingDays: string | null;
    trainingTime: string | null;
    mealWindow?: string | null;
  },
) {
  const centreId = session.centreIds[0];
  if (!centreId) return { created: 0, existing: 0 };

  const days = parseTrainingDays(settings.trainingDays);
  const timeSlot = settings.trainingTime?.trim() || "3–4pm";
  let created = 0;
  let existing = 0;

  for (const dayOfWeek of days) {
    const [row] = await db
      .select({ id: scheduleBlocks.id })
      .from(scheduleBlocks)
      .where(
        and(
          eq(scheduleBlocks.trainerId, session.userId),
          eq(scheduleBlocks.dayOfWeek, dayOfWeek),
          eq(scheduleBlocks.timeSlot, timeSlot),
          eq(scheduleBlocks.blockType, "life"),
        ),
      )
      .limit(1);

    if (row) {
      existing++;
      continue;
    }

    await db.insert(scheduleBlocks).values({
      organisationId: session.organisationId,
      centreId,
      trainerId: session.userId,
      dayOfWeek,
      timeSlot,
      blockType: "life",
      label: "Own training",
    });
    created++;
  }

  const mealWindow = settings.mealWindow?.trim();
  if (mealWindow && days.length > 0) {
    for (const dayOfWeek of days) {
      const [row] = await db
        .select({ id: scheduleBlocks.id })
        .from(scheduleBlocks)
        .where(
          and(
            eq(scheduleBlocks.trainerId, session.userId),
            eq(scheduleBlocks.dayOfWeek, dayOfWeek),
            eq(scheduleBlocks.timeSlot, mealWindow),
            eq(scheduleBlocks.blockType, "shutdown"),
          ),
        )
        .limit(1);

      if (row) {
        existing++;
        continue;
      }

      await db.insert(scheduleBlocks).values({
        organisationId: session.organisationId,
        centreId,
        trainerId: session.userId,
        dayOfWeek,
        timeSlot: mealWindow,
        blockType: "shutdown",
        label: "Meal / break",
      });
      created++;
    }
  }

  return { created, existing };
}
