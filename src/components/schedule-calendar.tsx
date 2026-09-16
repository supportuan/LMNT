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
  if (status === "completed") return "border-l-lime-400 bg-lime-400/10";
  if (status === "in_progress") return "border-l-orange-500 bg-orange-500/10";
  if (status === "cancelled") return "border-l-zinc-500 bg-zinc-500/10";
  return "border-l-cyan-400 bg-cyan-400/10";
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
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900">
            <button
              type="button"
              onClick={() => setWeekStart((prev) => addDays(prev, -7))}
              className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="border-x border-zinc-800 px-3 py-1.5 text-sm font-medium hover:bg-zinc-800"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setWeekStart((prev) => addDays(prev, 7))}
              className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
            >
              Next
            </button>
          </div>
        </div>
        <div className="text-sm text-zinc-500">
          {sessions.filter((s) => {
            const d = new Date(s.scheduledAt);
            return d >= weekDays[0] && d < addDays(weekDays[6], 1);
          }).length}{" "}
          sessions this week
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-zinc-800 bg-zinc-900">
            <div className="p-2" />
            {weekDays.map((day) => {
              const isToday = day.toDateString() === today;
              return (
                <div
                  key={day.toISOString()}
                  className={`border-l border-zinc-800 p-2 text-center ${isToday ? "bg-orange-600/10" : ""}`}
                >
                  <div className="text-xs uppercase text-zinc-500">
                    {day.toLocaleDateString(undefined, { weekday: "short" })}
                  </div>
                  <div className={`text-sm font-semibold ${isToday ? "text-lime-300" : ""}`}>
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-zinc-800/60"
            >
              <div className="flex items-start justify-end p-2 text-[10px] text-zinc-500">
                {formatHour(hour)}
              </div>
              {weekDays.map((day) => {
                const key = `${day.toDateString()}-${hour}`;
                const cellSessions = sessionsByDayHour.get(key) ?? [];
                const isToday = day.toDateString() === today;
                return (
                  <div
                    key={key}
                    className={`min-h-[72px] border-l border-zinc-800/60 p-1 ${isToday ? "bg-orange-600/5" : ""}`}
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
                          <div className="font-semibold text-zinc-100">{session.memberName}</div>
                          <div className="text-zinc-400">{time}</div>
                          <div className="truncate text-zinc-500">
                            {session.programmeTitle ?? "PT Session"}
                          </div>
                          <div className="mt-1 capitalize text-zinc-500">{session.status}</div>
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
