import type { WeekPlan } from "@/lib/coach-pro/engine";

export function getCurrentWorkoutDay(
  weeks: WeekPlan[],
  completedSessionCount: number,
): { week: WeekPlan; day: WeekPlan["days"][number]; weekIndex: number; dayIndex: number } | null {
  if (!weeks.length) return null;

  const allDays = weeks.flatMap((w, wi) => w.days.map((d, di) => ({ week: w, day: d, weekIndex: wi, dayIndex: di })));
  if (!allDays.length) return null;

  const index = Math.min(completedSessionCount, allDays.length - 1);
  return allDays[index];
}

export function countProgrammeDays(weeks: WeekPlan[]) {
  return weeks.reduce((sum, w) => sum + w.days.length, 0);
}
