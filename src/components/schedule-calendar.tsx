"use client";

import { useMemo, useState } from "react";
import type { ScheduleSession } from "@/modules/queries";

const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatHour(hour: number) {
  if (hour === 12) return "12 PM";
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}

function sessionTone(status: string) {
  if (status === "completed") return "border-l-[var(--emerald-neon)] bg-[var(--emerald-neon-tint)]";
  if (status === "in_progress") return "border-l-[var(--kinetic-orange)] bg-[var(--kinetic-orange)]/10";
  if (status === "cancelled") return "border-l-[var(--moss-500)] bg-[var(--moss-tint)]";
  return "border-l-[var(--moss-300)] bg-[var(--moss-tint-strong)]";
}

export function ScheduleCalendar({ sessions }: { sessions: ScheduleSession[] }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const weekLabel = `${weekDays[0].toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  })} – ${weekDays[6].toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`;

  const sessionsByDayHour = useMemo(() => {
    const map = new Map<string, ScheduleSession[]>();
    for (const session of sessions) {
      const date = new Date(session.scheduledAt);
      const dayKey = date.toDateString();
      const hourKey = `${dayKey}-${date.getHours()}`;
      const list = map.get(hourKey) ?? [];
      list.push(session);
      map.set(hourKey, list);
    }
    return map;
  }, [sessions]);

  const today = new Date().toDateString();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">{weekLabel}</h2>
          <div className="flex items-center rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)]">
            <button
              type="button"
              onClick={() => setWeekStart((prev) => addDays(prev, -7))}
              className="px-3 py-1.5 text-sm text-[var(--workspace-muted)] hover:text-[var(--workspace-text)]"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="border-x border-[var(--workspace-border)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--moss-tint)]"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setWeekStart((prev) => addDays(prev, 7))}
              className="px-3 py-1.5 text-sm text-[var(--workspace-muted)] hover:text-[var(--workspace-text)]"
            >
              Next
            </button>
          </div>
        </div>
        <div className="text-sm text-[var(--workspace-subtle)]">
          {sessions.filter((s) => {
            const d = new Date(s.scheduledAt);
            return d >= weekDays[0] && d < addDays(weekDays[6], 1);
          }).length}{" "}
          sessions this week
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--workspace-border)]">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-[var(--workspace-border)] bg-[var(--workspace-surface)]">
            <div className="p-2" />
            {weekDays.map((day) => {
              const isToday = day.toDateString() === today;
              return (
                <div
                  key={day.toISOString()}
                  className={`border-l border-[var(--workspace-border)] p-2 text-center ${isToday ? "bg-[var(--emerald-neon-tint)]" : ""}`}
                >
                  <div className="text-xs uppercase text-[var(--workspace-subtle)]">
                    {day.toLocaleDateString(undefined, { weekday: "short" })}
                  </div>
                  <div className={`text-sm font-semibold ${isToday ? "text-[var(--emerald-neon)]" : ""}`}>
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-[var(--moss-900)]"
            >
              <div className="flex items-start justify-end p-2 text-[10px] text-[var(--workspace-subtle)]">
                {formatHour(hour)}
              </div>
              {weekDays.map((day) => {
                const key = `${day.toDateString()}-${hour}`;
                const cellSessions = sessionsByDayHour.get(key) ?? [];
                const isToday = day.toDateString() === today;
                return (
                  <div
                    key={key}
                    className={`min-h-[72px] border-l border-[var(--moss-900)] p-1 ${isToday ? "bg-[var(--emerald-neon)]/5" : ""}`}
                  >
                    {cellSessions.map((session) => {
                      const time = new Date(session.scheduledAt).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      });
                      return (
                        <div
                          key={session.id}
                          className={`mb-1 rounded border-l-[3px] p-2 text-xs ${sessionTone(session.status)}`}
                        >
                          <div className="font-semibold text-[var(--workspace-text)]">{session.memberName}</div>
                          <div className="text-[var(--workspace-muted)]">{time}</div>
                          <div className="truncate text-[var(--workspace-subtle)]">
                            {session.programmeTitle ?? "PT Session"}
                          </div>
                          <div className="mt-1 capitalize text-[var(--workspace-subtle)]">{session.status}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
