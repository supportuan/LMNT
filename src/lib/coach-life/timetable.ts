export type BlockType = "client" | "deep_work" | "admin" | "life" | "shutdown";

/** Monday-first display order; `dow` matches JS `Date#getDay()` (0 = Sun). */
export const WEEK_DAYS = [
  { dow: 1, short: "Mon" },
  { dow: 2, short: "Tue" },
  { dow: 3, short: "Wed" },
  { dow: 4, short: "Thu" },
  { dow: 5, short: "Fri" },
  { dow: 6, short: "Sat" },
  { dow: 0, short: "Sun" },
] as const;

export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const TIME_SLOTS = [
  "5–6am",
  "6–7am",
  "7–8am",
  "8–9am",
  "9–10am",
  "10–11am",
  "11–12pm",
  "12–1pm",
  "1–2pm",
  "2–3pm",
  "3–4pm",
  "4–5pm",
  "5–6pm",
  "6–7pm",
  "7–8pm",
  "8–9pm",
  "9–10pm",
  "10–11pm",
] as const;

/** Slots shown on the Today mini timetable. */
export const COMPACT_SLOTS = [1, 2, 4, 6, 8, 10, 12, 13, 14, 16].map((i) => TIME_SLOTS[i]);

export const BLOCK_TYPES: { value: BlockType; label: string; defaultLabel: string }[] = [
  { value: "client", label: "Client", defaultLabel: "Client" },
  { value: "deep_work", label: "Deep work", defaultLabel: "Deep Work" },
  { value: "admin", label: "Admin", defaultLabel: "Admin" },
  { value: "life", label: "Personal / recovery", defaultLabel: "Personal / Recovery" },
  { value: "shutdown", label: "Shutdown", defaultLabel: "Shutdown" },
];

export const BLOCK_STYLES: Record<BlockType, string> = {
  client:
    "bg-[var(--emerald-neon-tint)] text-[var(--emerald-neon)] ring-1 ring-inset ring-[var(--emerald-neon)]/30",
  deep_work: "bg-[var(--moss-tint-strong)] text-[var(--moss-300)]",
  admin: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
  life: "bg-[var(--moss-tint)] text-[var(--workspace-text)] ring-1 ring-inset ring-[var(--moss-700)]",
  shutdown: "bg-[var(--status-danger-bg)] text-[var(--status-danger)]",
};

/** Start hour (0–23) of a slot like "7–8am", "11–12pm" or "12–1pm". */
export function slotStartHour(slot: string): number | null {
  const m = slot.replace(/[–—]/g, "-").match(/^(\d{1,2})(?::\d{2})?\s*(am|pm)?\s*-\s*(\d{1,2})(?::\d{2})?\s*(am|pm)$/i);
  if (!m) return null;
  const start = Number(m[1]) % 12;
  const end = Number(m[3]) % 12;
  const startMeridiem = m[2]?.toLowerCase();
  if (startMeridiem) return start + (startMeridiem === "pm" ? 12 : 0);
  const end24 = end + (m[4].toLowerCase() === "pm" ? 12 : 0);
  const duration = (end - start + 12) % 12 || 12;
  return (end24 - duration + 24) % 24;
}

export function slotForHour(hour: number): string | null {
  return TIME_SLOTS.find((s) => slotStartHour(s) === hour) ?? null;
}

export function todayDow(date = new Date()) {
  return date.getDay();
}

export function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Monday of the week containing `date`, as YYYY-MM-DD. */
export function weekKey(date = new Date()) {
  const x = new Date(date);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return localDateKey(x);
}

export function parseDayList(value: string | null | undefined): number[] {
  if (!value) return [];
  const out = new Set<number>();
  for (const part of value.split(/[,;\s]+/)) {
    const idx = DAY_SHORT.findIndex((d) => d.toLowerCase() === part.trim().slice(0, 3).toLowerCase());
    if (idx >= 0) out.add(idx);
  }
  return [...out];
}

export function formatDayList(dows: number[]) {
  return WEEK_DAYS.filter((d) => dows.includes(d.dow))
    .map((d) => d.short)
    .join(", ");
}
