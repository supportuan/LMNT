"use client";

import { useMemo, useState } from "react";
import type { ScheduleSession } from "@/modules/queries";
import { ScheduleCalendar } from "@/components/schedule-calendar";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameWeek(date: Date, weekStart: Date) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 7);
  return date >= weekStart && date < end;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function TrainerScheduleView({ sessions }: { sessions: ScheduleSession[] }) {
  const [tab, setTab] = useState<"today" | "week">("today");
  const now = useMemo(() => new Date(), []);
  const weekStart = useMemo(() => startOfWeek(now), [now]);

  const todaySessions = useMemo(
    () =>
      sessions
        .filter((s) => isSameDay(new Date(s.scheduledAt), now))
        .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt)),
    [sessions, now],
  );

  const weekSessions = useMemo(
    () => sessions.filter((s) => isSameWeek(new Date(s.scheduledAt), weekStart)),
    [sessions, weekStart],
  );

  const nextSession = useMemo(() => {
    const upcoming = sessions
      .filter((s) => new Date(s.scheduledAt) >= now && s.status !== "cancelled")
      .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
    return upcoming[0] ?? null;
  }, [sessions, now]);

  const painFlags = sessions.filter((s) => s.painFlag).length;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("today")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "today" ? "bg-orange-600 text-lime-300" : "bg-zinc-900 text-zinc-400"
          }`}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setTab("week")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "week" ? "bg-orange-600 text-lime-300" : "bg-zinc-900 text-zinc-400"
          }`}
        >
          Week
        </button>
      </div>

      {tab === "today" && (
        <div className="space-y-4">
          <div className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="text-xs uppercase tracking-wider text-zinc-500">Next client</div>
              <div className="mt-1 text-2xl font-bold">
                {nextSession ? nextSession.memberName : "No session booked"}
              </div>
              <div className="mt-1 text-sm text-zinc-400">
                {nextSession
                  ? `${new Date(nextSession.scheduledAt).toLocaleString()} · ${nextSession.programmeTitle ?? "PT session"}`
                  : "Open Week to review your timetable."}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Today" value={String(todaySessions.length)} />
              <Stat label="This week" value={String(weekSessions.length)} />
              <Stat label="Pain flags" value={String(painFlags)} />
              <Stat label="Coaching load" value={`${weekSessions.length}h est.`} />
            </div>
          </div>

          {painFlags > 0 && (
            <div className="rounded-lg border border-orange-800/50 bg-orange-950/30 px-4 py-3 text-sm text-orange-200">
              {painFlags} session(s) flagged pain — review before next block.
            </div>
          )}

          <section className="rounded-xl border border-zinc-800 p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Today&apos;s sessions
            </h3>
            {todaySessions.length === 0 ? (
              <p className="text-sm text-zinc-500">No sessions today. Protect recovery time.</p>
            ) : (
              <div className="space-y-2">
                {todaySessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 px-4 py-3 text-sm"
                  >
                    <div>
                      <div className="font-medium">{s.memberName}</div>
                      <div className="text-zinc-500">
                        {new Date(s.scheduledAt).toLocaleTimeString()} · {s.programmeTitle ?? "PT"}
                      </div>
                    </div>
                    <span className="capitalize text-zinc-400">{s.status}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "week" && <ScheduleCalendar sessions={sessions} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/40 px-3 py-2">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] uppercase text-zinc-500">{label}</div>
    </div>
  );
}
