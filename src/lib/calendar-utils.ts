export type CalendarEvent = {
  id: string;
  type: "session" | "task";
  title: string;
  subtitle?: string | null;
  start: string;
  end: string;
  status: string;
  memberId?: string | null;
  href?: string;
};

export type CalendarClient = {
  id: string;
  name: string;
  programmeId?: string | null;
};

export function startOfWeek(date: Date, weekStartsOn = 1) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  if (weekStartsOn === 0) {
    d.setDate(d.getDate() - day);
  } else {
    d.setDate(d.getDate() + diff);
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMinutes(date: Date, mins: number) {
  return new Date(date.getTime() + mins * 60_000);
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatHourLabel(hour: number) {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}

export const GRID_START_HOUR = 6;
export const GRID_END_HOUR = 21;
export const HOUR_HEIGHT = 48;
export const DEFAULT_SESSION_MINS = 60;
export const DEFAULT_TASK_MINS = 30;

export function eventStyle(type: CalendarEvent["type"], status: string) {
  if (type === "task") {
    return {
      bg: "bg-violet-100",
      border: "border-violet-400",
      text: "text-violet-900",
      dot: "bg-violet-500",
    };
  }
  if (status === "completed") return { bg: "bg-emerald-100", border: "border-emerald-500", text: "text-emerald-900", dot: "bg-emerald-500" };
  if (status === "in_progress") return { bg: "bg-amber-100", border: "border-amber-500", text: "text-amber-900", dot: "bg-amber-500" };
  if (status === "cancelled") return { bg: "bg-gray-100", border: "border-gray-400", text: "text-gray-600", dot: "bg-gray-400" };
  return { bg: "bg-sky-100", border: "border-sky-500", text: "text-sky-900", dot: "bg-sky-500" };
}

export function layoutEvent(start: Date, end: Date) {
  const startMins = (start.getHours() - GRID_START_HOUR) * 60 + start.getMinutes();
  const endMins = (end.getHours() - GRID_START_HOUR) * 60 + end.getMinutes();
  const top = (startMins / 60) * HOUR_HEIGHT;
  const height = Math.max(((endMins - startMins) / 60) * HOUR_HEIGHT, 22);
  return { top, height };
}

export function toDatetimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string) {
  return new Date(value);
}
