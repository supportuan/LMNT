import { addDays, addMinutes, DEFAULT_SESSION_MINS, startOfWeek } from "@/lib/calendar-utils";
import { parseTimeSlotToMinutes } from "@/lib/coach-life/life-blocks";

export type RosterBlock = {
  dayOfWeek: number;
  timeSlot: string;
  blockType: string;
  label: string;
  memberId: string | null;
};

export type TrainerSlot = {
  startsAt: string;
  endsAt: string;
  label: string;
  free: boolean;
};

export type BusyInterval = {
  scheduledAt: Date;
};

function dateAtMinutes(weekStart: Date, dayOfWeek: number, minutes: number): Date {
  const startDay = weekStart.getDay();
  const offset = (dayOfWeek - startDay + 7) % 7;
  const d = addDays(weekStart, offset);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

function overlapsBusy(start: Date, busy: BusyInterval[], durationMins = DEFAULT_SESSION_MINS): boolean {
  const end = addMinutes(start, durationMins);
  return busy.some((b) => {
    const bEnd = addMinutes(b.scheduledAt, durationMins);
    return start < bEnd && end > b.scheduledAt;
  });
}

/** Suggest assessment slots from client blocks (or weekday 9–18 fallback). */
export function suggestTrainerSlots(
  blocks: RosterBlock[],
  busy: BusyInterval[],
  weekStart = startOfWeek(new Date()),
): TrainerSlot[] {
  const clientBlocks = blocks.filter((b) => b.blockType === "client");
  const source = clientBlocks.length > 0 ? clientBlocks : defaultWeekdayBlocks();

  const slots: TrainerSlot[] = [];
  const step = 30;

  for (const block of source) {
    const range = parseTimeSlotToMinutes(block.timeSlot);
    if (!range) continue;

    for (let m = range.start; m + DEFAULT_SESSION_MINS <= range.end; m += step) {
      const start = dateAtMinutes(weekStart, block.dayOfWeek, m);
      if (start.getTime() < Date.now() - 5 * 60_000) continue;
      const end = addMinutes(start, DEFAULT_SESSION_MINS);
      const free = !overlapsBusy(start, busy);
      slots.push({
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        label: block.label || block.timeSlot,
        free,
      });
    }
  }

  return slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

function defaultWeekdayBlocks(): RosterBlock[] {
  const rows: RosterBlock[] = [];
  for (let day = 1; day <= 5; day++) {
    rows.push({
      dayOfWeek: day,
      timeSlot: "9:00-18:00",
      blockType: "client",
      label: "Open floor",
      memberId: null,
    });
  }
  return rows;
}