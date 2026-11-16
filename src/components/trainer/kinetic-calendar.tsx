"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
import type { CalendarClient, CalendarEvent } from "@/lib/calendar-utils";
import {
  GRID_END_HOUR,
  GRID_START_HOUR,
  HOUR_HEIGHT,
  addDays,
  formatTime,
  fromDatetimeLocalValue,
  isSameDay,
  layoutEvent,
  startOfWeek,
  toDatetimeLocalValue,
} from "@/lib/calendar-utils";

type View = "week" | "month";
type CreateKind = "session" | "task";

type PendingLead = {
  id: string;
  name: string;
  stage: string;
  email?: string | null;
  notes?: string | null;
};

function eventCardClass(event: CalendarEvent) {
  if (event.type === "task") return "kinetic-cardio";
  if (event.status === "in_progress") return "kinetic-hiit";
  if (event.status === "cancelled") return "kinetic-muted";
  if (event.subtitle?.toLowerCase().includes("hiit")) return "kinetic-hiit";
  if (
    event.subtitle?.toLowerCase().includes("recovery") ||
    event.subtitle?.toLowerCase().includes("cardio")
  ) {
    return "kinetic-cardio";
  }
  return "kinetic-strength";
}

function eventTitleColor(event: CalendarEvent) {
  const cls = eventCardClass(event);
  if (cls === "kinetic-hiit") return "text-[var(--kinetic-orange)]";
  if (cls === "kinetic-cardio") return "text-[var(--moss-300)]";
  if (cls === "kinetic-muted") return "text-[var(--moss-400)]";
  return "text-[var(--emerald-neon)]";
}

function relativeTime(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  const mins = Math.round(diff / 60_000);
  if (mins < 0) return "Started";
  if (mins < 60) return `In ${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rm = mins % 60;
  return rm ? `In ${hrs}h ${rm}m` : `In ${hrs}h`;
}

export function KineticCalendarView({
  events,
  clients,
  pendingLeads,
  trainers,
}: {
  events: CalendarEvent[];
  clients: CalendarClient[];
  pendingLeads: PendingLead[];
  trainers?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<CreateKind>("session");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [draftStart, setDraftStart] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  });

  const today = useMemo(() => new Date(), []);
  const weekStart = useMemo(() => startOfWeek(cursor), [cursor]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const hours = useMemo(
    () => Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => GRID_START_HOUR + i),
    [],
  );

  const monthDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    return Array.from({ length: 42 }, (_, i) => addDays(startOfWeek(first), i));
  }, [cursor]);

  const headerMonth = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const upcoming = useMemo(
    () =>
      events
        .filter((e) => new Date(e.start) >= new Date() && e.status !== "cancelled")
        .sort((a, b) => +new Date(a.start) - +new Date(b.start))
        .slice(0, 6),
    [events],
  );

  const navigate = (dir: -1 | 0 | 1) => {
    if (dir === 0) {
      setCursor(new Date());
      return;
    }
    const d = new Date(cursor);
    if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCursor(d);
  };

  const openCreate = (kind: CreateKind = "session", at?: Date) => {
    setCreateKind(kind);
    if (at) setDraftStart(at);
    setCreateOpen(true);
    setSelectedEvent(null);
  };

  const onSlotClick = (day: Date, hour: number) => {
    const at = new Date(day);
    at.setHours(hour, 0, 0, 0);
    openCreate("session", at);
  };

  const isWeekend = (day: Date) => {
    const dow = day.getDay();
    return dow === 0 || dow === 6;
  };

  return (
    <div className="kinetic-calendar flex min-h-[calc(100vh-4rem)] flex-col bg-[var(--jet-950)] text-[var(--workspace-text)] lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[var(--moss-800)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-xl font-bold tracking-tight">{headerMonth}</h2>
            <div className="flex rounded border border-[var(--moss-800)] bg-[var(--jet-850)] p-1">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded p-1 text-[var(--moss-300)] transition hover:bg-[var(--moss-800)] hover:text-white"
                aria-label="Previous"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => navigate(0)}
                className="rounded px-3 py-1 font-mono text-xs font-medium uppercase tracking-wide hover:bg-[var(--moss-800)]"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => navigate(1)}
                className="rounded p-1 text-[var(--moss-300)] transition hover:bg-[var(--moss-800)] hover:text-white"
                aria-label="Next"
              >
                ›
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded border border-[var(--moss-800)] bg-[var(--jet-850)] p-1 font-mono text-xs uppercase tracking-wide">
              <button
                type="button"
                onClick={() => setView("week")}
                className={`rounded px-4 py-1.5 font-bold transition ${
                  view === "week" ? "bg-[var(--moss-800)] text-[var(--workspace-text)]" : "text-[var(--moss-300)] hover:text-white"
                }`}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => setView("month")}
                className={`rounded px-4 py-1.5 transition ${
                  view === "month" ? "bg-[var(--moss-800)] font-bold text-[var(--workspace-text)]" : "text-[var(--moss-300)] hover:text-white"
                }`}
              >
                Month
              </button>
            </div>
            <button
              type="button"
              onClick={() => openCreate("session")}
              className="flex items-center gap-2 rounded bg-[var(--emerald-neon)] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wide text-[var(--emerald-neon-ink)] transition hover:bg-[var(--emerald-neon-hover)]"
            >
              <span className="text-base leading-none">+</span>
              Quick Add
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden p-4 md:p-6">
          <div className="flex min-h-[560px] flex-1 flex-col overflow-hidden rounded-xl border border-[var(--moss-800)] bg-[var(--jet-900)]">
            {view === "week" ? (
              <>
                <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[var(--moss-800)] bg-[var(--jet-900)]">
                  <div className="border-r border-[var(--moss-800)] p-3" />
                  {weekDays.map((day) => {
                    const isToday = isSameDay(day, today);
                    const weekend = isWeekend(day);
                    return (
                      <div
                        key={day.toISOString()}
                        className={`relative border-r border-[var(--moss-800)] p-3 text-center last:border-r-0 ${
                          isToday ? "bg-[var(--moss-800)]/30" : ""
                        }`}
                      >
                        {isToday && (
                          <div className="absolute left-0 right-0 top-0 h-1 bg-[var(--emerald-neon)]" />
                        )}
                        <div
                          className={`font-mono text-xs uppercase tracking-wider ${
                            isToday ? "font-bold text-[var(--emerald-neon)]" : weekend ? "text-[var(--moss-400)]" : "text-[var(--moss-300)]"
                          }`}
                        >
                          {day.toLocaleDateString(undefined, { weekday: "short" })}
                        </div>
                        <div
                          className={`mt-1 text-xl font-bold ${
                            isToday ? "text-[var(--emerald-neon)]" : weekend ? "text-[var(--moss-400)]" : ""
                          }`}
                        >
                          {day.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="relative flex-1 overflow-y-auto">
                  <div
                    className="grid gap-px bg-[var(--moss-900)]"
                    style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}
                  >
                    {hours.map((hour) => (
                      <Fragment key={hour}>
                        <div
                          className="flex items-start justify-end bg-[var(--jet-950)] px-2 py-2 font-mono text-[10px] text-[var(--moss-300)]"
                          style={{ minHeight: HOUR_HEIGHT }}
                        >
                          {String(hour).padStart(2, "0")}:00
                        </div>
                        {weekDays.map((day) => (
                          <div
                            key={`${day.toISOString()}-${hour}`}
                            className={`relative bg-[var(--jet-950)] p-1 ${isWeekend(day) ? "opacity-50" : ""}`}
                            style={{ minHeight: HOUR_HEIGHT }}
                          >
                            <button
                              type="button"
                              className="absolute inset-0 w-full hover:bg-[var(--emerald-neon)]/5"
                              onClick={() => onSlotClick(day, hour)}
                              aria-label="Add session"
                            />
                          </div>
                        ))}
                      </Fragment>
                    ))}
                  </div>

                  <div
                    className="pointer-events-none absolute inset-0 grid"
                    style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}
                  >
                    <div />
                    {weekDays.map((day) => (
                      <div key={`ev-${day.toISOString()}`} className="relative">
                        {events
                          .filter((e) => isSameDay(new Date(e.start), day))
                          .map((event) => {
                            const start = new Date(event.start);
                            const end = new Date(event.end);
                            const { top, height } = layoutEvent(start, end);
                            return (
                              <button
                                key={`${event.type}-${event.id}`}
                                type="button"
                                style={{ top, height, zIndex: 10 }}
                                className={`pointer-events-auto absolute left-1 right-1 overflow-hidden rounded p-2 text-left transition hover:scale-[0.98] ${eventCardClass(event)}`}
                                onClick={() => {
                                  setSelectedEvent(event);
                                  setCreateOpen(false);
                                }}
                              >
                                <div className="font-mono text-[10px] text-[var(--moss-300)]">
                                  {formatTime(start)} – {formatTime(end)}
                                </div>
                                <div className={`font-mono text-xs font-bold ${eventTitleColor(event)}`}>
                                  {event.type === "session" ? event.subtitle ?? "PT Session" : event.title}
                                </div>
                                <div className="mt-1 font-mono text-[11px] text-[var(--workspace-text)]">👤 {event.title}</div>
                              </button>
                            );
                          })}
                        {isSameDay(day, today) && <NowLine />}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-6 border-t border-[var(--moss-800)] bg-[var(--jet-850)] p-3 font-mono text-xs uppercase tracking-wide">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-[var(--emerald-neon)]" />
                    <span className="text-[var(--moss-300)]">Strength / Session</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-[var(--kinetic-orange)]" />
                    <span className="text-[var(--moss-300)]">In progress / HIIT</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-[var(--moss-300)]" />
                    <span className="text-[var(--moss-300)]">Tasks / Recovery</span>
                  </div>
                </div>
              </>
            ) : (
              <MonthView
                monthDays={monthDays}
                cursor={cursor}
                today={today}
                events={events}
                onDayClick={(d) => {
                  setCursor(d);
                  setView("week");
                }}
                onEventClick={setSelectedEvent}
              />
            )}
          </div>
        </div>
      </div>

      <aside className="hidden w-80 shrink-0 flex-col border-l border-[var(--moss-800)] bg-[var(--jet-900)] lg:flex">
        <div className="border-b border-[var(--moss-800)] p-4">
          <h3 className="text-lg font-bold">Upcoming</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="font-mono text-xs uppercase tracking-wider text-[var(--moss-300)]">Today &amp; next</div>
          <div className="mt-3 space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-[var(--moss-400)]">No upcoming sessions.</p>
            ) : (
              upcoming.map((ev) => (
                <button
                  key={`${ev.type}-${ev.id}`}
                  type="button"
                  onClick={() => setSelectedEvent(ev)}
                  className="w-full rounded-lg border border-[var(--moss-800)] bg-[var(--jet-950)] p-3 text-left transition hover:border-[var(--emerald-neon)]/40"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <span className={`font-mono text-xs font-bold ${eventTitleColor(ev)}`}>
                      {ev.type === "session" ? ev.subtitle ?? "PT Session" : ev.title}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--moss-400)]">{relativeTime(ev.start)}</span>
                  </div>
                  <div className="font-mono text-xs text-[var(--moss-300)]">
                    {formatTime(new Date(ev.start))} – {formatTime(new Date(ev.end))}
                  </div>
                  <div className="mt-1 font-mono text-xs text-[var(--moss-300)]">👤 {ev.title}</div>
                </button>
              ))
            )}
          </div>

          {pendingLeads.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between font-mono text-xs uppercase tracking-wider text-[var(--moss-300)]">
                Pending requests
                <span className="rounded-full bg-[var(--status-danger)] px-2 py-0.5 text-[10px] font-bold text-[var(--jet-950)]">
                  {pendingLeads.length}
                </span>
              </div>
              <div className="mt-3 space-y-3">
                {pendingLeads.slice(0, 3).map((lead) => (
                  <div key={lead.id} className="rounded-lg border border-[var(--moss-800)] bg-[var(--jet-950)] p-3">
                    <div className="font-mono text-xs font-bold capitalize text-[var(--workspace-text)]">
                      {lead.stage.replace("_", " ")}
                    </div>
                    <div className="mt-1 text-sm text-[var(--moss-300)]">New lead: {lead.name}</div>
                    <Link
                      href="/app/leads"
                      className="mt-3 inline-block rounded bg-[var(--emerald-neon)] px-3 py-1 font-mono text-xs font-bold text-[var(--emerald-neon-ink)] hover:bg-[var(--emerald-neon-hover)]"
                    >
                      View in Leads
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {createOpen && (
        <CreateModal
          kind={createKind}
          start={draftStart}
          clients={clients}
          trainers={trainers}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            router.refresh();
          }}
          onSwitchKind={setCreateKind}
        />
      )}

      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onChanged={() => {
            setSelectedEvent(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function NowLine() {
  const now = new Date();
  const mins = (now.getHours() - GRID_START_HOUR) * 60 + now.getMinutes();
  if (now.getHours() < GRID_START_HOUR || now.getHours() >= GRID_END_HOUR) return null;
  const top = (mins / 60) * HOUR_HEIGHT;
  return (
    <div className="pointer-events-none absolute left-0 right-0 z-20" style={{ top }}>
      <div className="relative flex h-px items-center bg-[var(--status-danger)]">
        <div className="-ml-1 h-2 w-2 rounded-full bg-[var(--status-danger)]" />
      </div>
    </div>
  );
}

function MonthView({
  monthDays,
  cursor,
  today,
  events,
  onDayClick,
  onEventClick,
}: {
  monthDays: Date[];
  cursor: Date;
  today: Date;
  events: CalendarEvent[];
  onDayClick: (d: Date) => void;
  onEventClick: (e: CalendarEvent) => void;
}) {
  return (
    <div className="flex-1 overflow-auto p-2">
      <div className="grid grid-cols-7 gap-px bg-[var(--moss-900)] font-mono text-xs uppercase tracking-wide text-[var(--moss-300)]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="bg-[var(--jet-900)] p-2 text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-[var(--moss-900)]">
        {monthDays.map((day) => {
          const inMonth = day.getMonth() === cursor.getMonth();
          const dayEvents = events.filter((e) => isSameDay(new Date(e.start), day));
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDayClick(day)}
              className={`min-h-[100px] bg-[var(--jet-950)] p-2 text-left hover:bg-[var(--jet-900)] ${
                !inMonth ? "opacity-40" : ""
              }`}
            >
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                  isSameDay(day, today) ? "bg-[var(--emerald-neon)] text-[var(--emerald-neon-ink)]" : ""
                }`}
              >
                {day.getDate()}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={`${ev.type}-${ev.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && onEventClick(ev)}
                    className={`truncate rounded px-1 py-0.5 font-mono text-[10px] ${eventCardClass(ev)} ${eventTitleColor(ev)}`}
                  >
                    {formatTime(new Date(ev.start))} {ev.title}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CreateModal({
  kind,
  start,
  clients,
  trainers,
  onClose,
  onSuccess,
  onSwitchKind,
}: {
  kind: CreateKind;
  start: Date;
  clients: CalendarClient[];
  trainers?: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
  onSwitchKind: (k: CreateKind) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [memberId, setMemberId] = useState(clients[0]?.id ?? "");
  const [trainerId, setTrainerId] = useState(trainers?.[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [datetime, setDatetime] = useState(toDatetimeLocalValue(start));

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const scheduledAt = fromDatetimeLocalValue(datetime).toISOString();
      if (kind === "session") {
        if (!memberId) throw new Error("Select a client");
        const client = clients.find((c) => c.id === memberId);
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId,
            programmeId: client?.programmeId ?? undefined,
            scheduledAt,
            ...(trainerId ? { trainerId } : {}),
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      } else {
        if (!title.trim()) throw new Error("Title required");
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description, dueAt: scheduledAt }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-[var(--moss-800)] bg-[var(--jet-900)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--moss-800)] p-4">
          <h3 className="text-lg font-bold">New {kind === "session" ? "Session" : "Task"}</h3>
          <button type="button" onClick={onClose} className="text-[var(--moss-300)] hover:text-white">
            ✕
          </button>
        </div>
        <div className="flex gap-2 border-b border-[var(--moss-800)] px-4 py-3">
          {(["session", "task"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => onSwitchKind(k)}
              className={`rounded px-3 py-1 font-mono text-xs uppercase ${
                kind === k ? "bg-[var(--emerald-neon)] font-bold text-[var(--emerald-neon-ink)]" : "text-[var(--moss-300)]"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="space-y-4 p-4">
          {kind === "session" ? (
            <>
              <label className="block text-sm">
                <span className="mb-1 block font-mono text-xs uppercase text-[var(--moss-300)]">Client</span>
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full rounded border border-[var(--moss-800)] bg-[var(--jet-950)] px-3 py-2 text-sm text-[var(--workspace-text)]"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              {trainers && trainers.length > 0 && (
                <label className="block text-sm">
                  <span className="mb-1 block font-mono text-xs uppercase text-[var(--moss-300)]">Trainer</span>
                  <select
                    value={trainerId}
                    onChange={(e) => setTrainerId(e.target.value)}
                    className="w-full rounded border border-[var(--moss-800)] bg-[var(--jet-950)] px-3 py-2 text-sm text-[var(--workspace-text)]"
                  >
                    {trainers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          ) : (
            <>
              <label className="block text-sm">
                <span className="mb-1 block font-mono text-xs uppercase text-[var(--moss-300)]">Title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded border border-[var(--moss-800)] bg-[var(--jet-950)] px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-mono text-xs uppercase text-[var(--moss-300)]">Notes</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded border border-[var(--moss-800)] bg-[var(--jet-950)] px-3 py-2 text-sm"
                />
              </label>
            </>
          )}
          <label className="block text-sm">
            <span className="mb-1 block font-mono text-xs uppercase text-[var(--moss-300)]">Date &amp; time</span>
            <input
              type="datetime-local"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              className="w-full rounded border border-[var(--moss-800)] bg-[var(--jet-950)] px-3 py-2 text-sm"
            />
          </label>
          {error && <p className="text-sm text-[var(--status-danger)]">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--moss-800)] p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-2 font-mono text-xs uppercase text-[var(--moss-300)] hover:bg-[var(--moss-800)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={submit}
            className="rounded bg-[var(--emerald-neon)] px-4 py-2 font-mono text-xs font-bold uppercase text-[var(--emerald-neon-ink)] disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EventModal({
  event,
  onClose,
  onChanged,
}: {
  event: CalendarEvent;
  onClose: () => void;
  onChanged: () => void;
}) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const [datetime, setDatetime] = useState(toDatetimeLocalValue(start));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canManage = event.type === "session" && event.status !== "cancelled";

  async function patch(body: Record<string, unknown>) {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/sessions/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not update session");
      return;
    }
    onChanged();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className={`w-full max-w-sm rounded-xl border border-[var(--moss-800)] bg-[var(--jet-900)] ${eventCardClass(event)} border-l-4 p-5`}
      >
        <div className="flex justify-between">
          <div>
            <div className="font-mono text-xs uppercase text-[var(--moss-300)]">
              {event.type === "session" ? "Client session" : "Task"}
            </div>
            <h3 className={`mt-1 text-xl font-bold ${eventTitleColor(event)}`}>
              {event.type === "session" ? event.subtitle ?? "PT Session" : event.title}
            </h3>
            <p className="text-sm text-[var(--moss-300)]">👤 {event.title}</p>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--moss-300)]">
            ✕
          </button>
        </div>
        <p className="mt-4 font-mono text-sm text-[var(--workspace-text)]">
          {start.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          <br />
          {formatTime(start)} – {formatTime(end)}
        </p>
        {canManage && (
          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-mono text-xs uppercase text-[var(--moss-300)]">Reschedule</span>
            <input
              type="datetime-local"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              className="w-full rounded border border-[var(--moss-800)] bg-[var(--jet-950)] px-3 py-2 text-sm text-[var(--workspace-text)]"
            />
          </label>
        )}
        {error && <p className="mt-2 text-sm text-[var(--status-danger)]">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {event.href && (
            <Link
              href={event.href}
              className="rounded bg-[var(--emerald-neon)] px-4 py-2 font-mono text-xs font-bold text-[var(--emerald-neon-ink)]"
            >
              Open
            </Link>
          )}
          {event.memberId && (
            <Link
              href={`/app/clients/${event.memberId}`}
              className="rounded border border-[var(--moss-800)] px-4 py-2 font-mono text-xs text-[var(--workspace-text)]"
            >
              Client
            </Link>
          )}
          {canManage && (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() => patch({ scheduledAt: fromDatetimeLocalValue(datetime).toISOString() })}
                className="rounded border border-[var(--moss-800)] px-4 py-2 font-mono text-xs text-[var(--workspace-text)] disabled:opacity-50"
              >
                Reschedule
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => patch({ status: "cancelled" })}
                className="rounded border border-[var(--kinetic-orange)]/40 px-4 py-2 font-mono text-xs text-[var(--kinetic-orange)] disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
