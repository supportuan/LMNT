import { addDays } from "@/lib/calendar-utils";
import { parseTimeSlotToMinutes, parseTrainingDays } from "@/lib/coach-life/life-blocks";

export function resolvePackEndDate(startsAt: Date, validityMonths: number | null | undefined, endsAt?: Date | null) {
  if (endsAt) return endsAt;
  const months = validityMonths ?? 3;
  const end = new Date(startsAt);
  end.setUTCMonth(end.getUTCMonth() + months);
  return end;
}

/** Map training time text to hour/minute of first slot (local). */
export function trainingTimeToHm(trainingTime: string | null | undefined): { hour: number; minute: number } {
  const raw = trainingTime?.trim() || "9:00-10:00";
  const range = parseTimeSlotToMinutes(raw);
  if (!range) return { hour: 9, minute: 0 };
  return { hour: Math.floor(range.start / 60), minute: range.start % 60 };
}

export function generatePtSessionTimes(input: {
  startsAt: Date;
  endsAt: Date;
  trainingDays: string | null | undefined;
  trainingTime: string | null | undefined;
  sessionCount: number;
}): Date[] {
  const days = parseTrainingDays(input.trainingDays);
  const dow = days.length > 0 ? days : [1, 3, 5];
  const { hour, minute } = trainingTimeToHm(input.trainingTime);

  const times: Date[] = [];
  let cursor = new Date(input.startsAt);
  cursor.setHours(0, 0, 0, 0);

  const hardStop = input.endsAt.getTime();
  let guard = 0;

  while (times.length < input.sessionCount && cursor.getTime() < hardStop && guard < 400) {
    guard++;
    const day = cursor.getDay();
    if (dow.includes(day) && cursor.getTime() >= input.startsAt.getTime()) {
      const slot = new Date(cursor);
      slot.setHours(hour, minute, 0, 0);
      if (slot.getTime() >= input.startsAt.getTime() && slot.getTime() <= hardStop) {
        times.push(slot);
      }
    }
    cursor = addDays(cursor, 1);
  }

  return times;
}