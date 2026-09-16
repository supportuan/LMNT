"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { CalendarClient, CalendarEvent } from "@/lib/calendar-utils";
import {
  GRID_END_HOUR,
  GRID_START_HOUR,
  HOUR_HEIGHT,
  addDays,
  eventStyle,
  formatHourLabel,
  formatTime,
  fromDatetimeLocalValue,
  isSameDay,
  layoutEvent,
  startOfWeek,
  toDatetimeLocalValue,
} from "@/lib/calendar-utils";

type View = "day" | "week" | "month";
type CreateKind = "session" | "task";

export function GoogleCalendarView({
  events,
  clients,
}: {
  events: CalendarEvent[];
  clients: CalendarClient[];
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [showSessions, setShowSessions] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<CreateKind>("session");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [draftStart, setDraftStart] = useState<Date>(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  });

  const today = useMemo(() => new Date(), []);
  const weekStart = useMemo(() => startOfWeek(cursor), [cursor]);

  const visibleEvents = useMemo(
    () =>
      events.filter((e) => {
        if (e.type === "session" && !showSessions) return false;
        if (e.type === "task" && !showTasks) return false;
        return true;
      }),
    [events, showSessions, showTasks],
  );

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const monthDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const headerLabel = useMemo(() => {
    if (view === "day") {
      return cursor.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    if (view === "week") {
      const end = addDays(weekStart, 6);
      const sameMonth = weekStart.getMonth() === end.getMonth();
      if (sameMonth) {
        return `${weekStart.toLocaleDateString(undefined, { month: "long" })} ${weekStart.getDate()} – ${end.getDate()}, ${weekStart.getFullYear()}`;
      }
      return `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }, [view, cursor, weekStart]);

  const hours = useMemo(
    () => Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => GRID_START_HOUR + i),
    [],
  );

  const navigate = (dir: -1 | 0 | 1) => {
    if (dir === 0) {
      setCursor(new Date());
      return;
    }
    const d = new Date(cursor);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCursor(d);
  };

  const openCreate = (kind: CreateKind, at?: Date) => {
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

  const daysForGrid = view === "day" ? [cursor] : weekDays;

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[640px] overflow-hidden rounded-xl border border-[#dadce0] bg-white shadow-sm">
      <aside className="hidden w-[256px] shrink-0 flex-col border-r border-[#dadce0] p-4 lg:flex">
        <div className="relative mb-2">
          <button
            type="button"
            onClick={() => openCreate("session")}
            className="flex w-full items-center gap-3 rounded-2xl bg-white py-3 pl-4 pr-5 text-sm font-medium shadow-md ring-1 ring-[#dadce0] transition hover:shadow-lg"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--workspace-accent)] text-xl text-white">
              +
            </span>
            Create
          </button>
        </div>
        <div className="mb-4 flex flex-col gap-1 text-sm">
          <button
            type="button"
            onClick={() => openCreate("session")}
            className="rounded px-2 py-1.5 text-left hover:bg-[#f1f3f4]"
          >
            + Client session
          </button>
          <button
            type="button"
            onClick={() => openCreate("task")}
            className="rounded px-2 py-1.5 text-left hover:bg-[#f1f3f4]"
          >
            + Task
          </button>
        </div>

        <MiniMonth
          cursor={cursor}
          today={today}
          onSelectDay={(d) => {
            setCursor(d);
            setView("day");
          }}
        />

        <div className="mt-6 space-y-2 text-sm">
          <div className="px-2 text-xs font-medium uppercase tracking-wide text-[#70757a]">
            My calendars
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-[#f1f3f4]">
            <input
              type="checkbox"
              checked={showSessions}
              onChange={(e) => setShowSessions(e.target.checked)}
              className="rounded border-[#dadce0]"
            />
            <span className="h-3 w-3 rounded-sm bg-sky-500" />
            Client sessions
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-[#f1f3f4]">
            <input
              type="checkbox"
              checked={showTasks}
              onChange={(e) => setShowTasks(e.target.checked)}
              className="rounded border-[#dadce0]"
            />
            <span className="h-3 w-3 rounded-sm bg-violet-500" />
            Tasks
          </label>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#dadce0] px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(0)}
            className="rounded border border-[#dadce0] px-4 py-1.5 text-sm font-medium hover:bg-[#f1f3f4]"
          >
            Today
          </button>
          <div className="flex items-center">
            <IconButton label="Previous" onClick={() => navigate(-1)}>
              ‹
            </IconButton>
            <IconButton label="Next" onClick={() => navigate(1)}>
              ›
            </IconButton>
          </div>
          <h1 className="min-w-[180px] text-xl font-normal text-[#3c4043]">{headerLabel}</h1>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => openCreate("session")}
              className="rounded-full bg-[var(--workspace-accent)] px-4 py-2 text-sm font-medium text-white lg:hidden"
            >
              + Create
            </button>
            <ViewSelect view={view} onChange={setView} />
          </div>
        </div>

        {view === "month" ? (
          <MonthGrid
            monthDays={monthDays}
            cursor={cursor}
            today={today}
            events={visibleEvents}
            onDayClick={(d) => {
              setCursor(d);
              setView("day");
            }}
            onEventClick={setSelectedEvent}
          />
        ) : (
          <>
            <div
              className="grid border-b border-[#dadce0]"
              style={{ gridTemplateColumns: `56px repeat(${daysForGrid.length}, 1fr)` }}
            >
              <div />
              {daysForGrid.map((day) => {
                const isToday = isSameDay(day, today);
                return (
                  <div
                    key={day.toISOString()}
                    className={`border-l border-[#dadce0] py-2 text-center ${isToday ? "bg-sky-50" : ""}`}
                  >
                    <div className="text-[11px] font-medium uppercase tracking-wide text-[#70757a]">
                      {day.toLocaleDateString(undefined, { weekday: "short" })}
                    </div>
                    <div
                      className={`mx-auto mt-0.5 flex h-9 w-9 items-center justify-center rounded-full text-2xl font-normal ${
                        isToday ? "bg-[var(--workspace-accent)] text-white" : "text-[#3c4043]"
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
                className="grid"
                style={{ gridTemplateColumns: `56px repeat(${daysForGrid.length}, 1fr)` }}
              >
                <div className="relative">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="relative border-b border-[#dadce0] text-right text-[10px] text-[#70757a]"
                      style={{ height: HOUR_HEIGHT }}
                    >
                      <span className="absolute -top-2 right-2">{formatHourLabel(hour)}</span>
                    </div>
                  ))}
                </div>

                {daysForGrid.map((day) => (
                  <div key={day.toISOString()} className="relative border-l border-[#dadce0]">
                    {hours.map((hour) => (
                      <button
                        key={hour}
                        type="button"
                        onClick={() => onSlotClick(day, hour)}
                        className="block w-full border-b border-[#dadce0] hover:bg-[#e8f0fe]/40"
                        style={{ height: HOUR_HEIGHT }}
                        aria-label={`Create at ${day.toDateString()} ${hour}:00`}
                      />
                    ))}

                    {visibleEvents
                      .filter((e) => isSameDay(new Date(e.start), day))
                      .map((event) => {
                        const start = new Date(event.start);
                        const end = new Date(event.end);
                        const { top, height } = layoutEvent(start, end);
                        const style = eventStyle(event.type, event.status);
                        return (
                          <button
                            key={`${event.type}-${event.id}`}
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setSelectedEvent(event);
                              setCreateOpen(false);
                            }}
                            className={`absolute left-1 right-1 overflow-hidden rounded border-l-[3px] px-1.5 py-0.5 text-left text-xs shadow-sm ${style.bg} ${style.border} ${style.text}`}
                            style={{ top, height, zIndex: 10 }}
                          >
                            <div className="truncate font-medium">{event.title}</div>
                            <div className="truncate opacity-80">
                              {formatTime(start)}
                              {event.subtitle ? ` · ${event.subtitle}` : ""}
                            </div>
                          </button>
                        );
                      })}

                    {isSameDay(day, today) && <NowLine />}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {createOpen && (
        <CreateEventModal
          kind={createKind}
          start={draftStart}
          clients={clients}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            router.refresh();
          }}
        />
      )}

      {selectedEvent && (
        <EventDetailPopover event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

function ViewSelect({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <select
      value={view}
      onChange={(e) => onChange(e.target.value as View)}
      className="rounded border border-[#dadce0] bg-white px-3 py-1.5 text-sm text-[#3c4043]"
    >
      <option value="day">Day</option>
      <option value="week">Week</option>
      <option value="month">Month</option>
    </select>
  );
}

function IconButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-[#5f6368] hover:bg-[#f1f3f4]"
    >
      {children}
    </button>
  );
}

function MiniMonth({
  cursor,
  today,
  onSelectDay,
}: {
  cursor: Date;
  today: Date;
  onSelectDay: (d: Date) => void;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const days = Array.from({ length: 42 }, (_, i) => addDays(startOfWeek(first), i));

  return (
    <div className="mt-2">
      <div className="mb-2 text-center text-sm font-medium text-[#3c4043]">
        {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
      </div>
      <div className="grid grid-cols-7 gap-0 text-center text-[10px] text-[#70757a]">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={`${d}-${i}`} className="py-1 font-medium">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const inMonth = day.getMonth() === cursor.getMonth();
          const isToday = isSameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                isToday
                  ? "bg-[var(--workspace-accent)] text-white"
                  : inMonth
                    ? "text-[#3c4043] hover:bg-[#f1f3f4]"
                    : "text-[#dadce0]"
              }`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthGrid({
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
      <div className="grid grid-cols-7 border-b border-[#dadce0] text-center text-[11px] font-medium text-[#70757a]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthDays.map((day) => {
          const inMonth = day.getMonth() === cursor.getMonth();
          const dayEvents = events.filter((e) => isSameDay(new Date(e.start), day));
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDayClick(day)}
              className={`min-h-[100px] border-b border-r border-[#dadce0] p-1 text-left hover:bg-[#f8f9fa] ${
                !inMonth ? "bg-[#fafafa] text-[#70757a]" : ""
              }`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  isSameDay(day, today) ? "bg-[var(--workspace-accent)] text-white" : ""
                }`}
              >
                {day.getDate()}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => {
                  const st = eventStyle(ev.type, ev.status);
                  return (
                    <div
                      key={`${ev.type}-${ev.id}`}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(ev);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && onEventClick(ev)}
                      className={`truncate rounded px-1 py-0.5 text-[10px] ${st.bg} ${st.text}`}
                    >
                      {formatTime(new Date(ev.start))} {ev.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-[#70757a]">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
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
      <div className="relative">
        <div className="absolute -left-1.5 h-2.5 w-2.5 rounded-full bg-red-500" />
        <div className="h-0.5 bg-red-500" />
      </div>
    </div>
  );
}

function CreateEventModal({
  kind: initialKind,
  start,
  clients,
  onClose,
  onSuccess,
}: {
  kind: CreateKind;
  start: Date;
  clients: CalendarClient[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [kind, setKind] = useState(initialKind);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [memberId, setMemberId] = useState(clients[0]?.id ?? "");
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
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to schedule session");
      } else {
        if (!title.trim()) throw new Error("Task title is required");
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description, dueAt: scheduledAt }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create task");
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#dadce0] px-5 py-4">
          <h2 className="text-lg font-medium text-[#3c4043]">Create event</h2>
          <button type="button" onClick={onClose} className="text-[#70757a] hover:text-[#3c4043]">
            ✕
          </button>
        </div>

        <div className="flex gap-2 border-b border-[#dadce0] px-5 py-3">
          {(["session", "task"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                kind === k
                  ? "bg-[#e8f0fe] text-[var(--workspace-accent)]"
                  : "text-[#70757a] hover:bg-[#f1f3f4]"
              }`}
            >
              {k === "session" ? "Client session" : "Task"}
            </button>
          ))}
        </div>

        <div className="space-y-4 px-5 py-4">
          {kind === "session" ? (
            <Field label="Client">
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full rounded border border-[#dadce0] px-3 py-2 text-sm"
              >
                {clients.length === 0 ? (
                  <option value="">No clients assigned</option>
                ) : (
                  clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </Field>
          ) : (
            <>
              <Field label="Title">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded border border-[#dadce0] px-3 py-2 text-sm"
                  placeholder="Follow up with client"
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded border border-[#dadce0] px-3 py-2 text-sm"
                />
              </Field>
            </>
          )}

          <Field label="Date & time">
            <input
              type="datetime-local"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              className="w-full rounded border border-[#dadce0] px-3 py-2 text-sm"
            />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#dadce0] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-2 text-sm font-medium text-[#70757a] hover:bg-[#f1f3f4]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={submit}
            className="rounded bg-[var(--workspace-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-[#3c4043]">{label}</span>
      {children}
    </label>
  );
}

function EventDetailPopover({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const style = eventStyle(event.type, event.status);
  const start = new Date(event.start);
  const end = new Date(event.end);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
        <div className={`border-l-4 px-5 py-4 ${style.border}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-[#70757a]">
                {event.type === "session" ? "Client session" : "Task"}
              </div>
              <h3 className="mt-1 text-xl font-normal text-[#3c4043]">{event.title}</h3>
              {event.subtitle && <p className="text-sm text-[#70757a]">{event.subtitle}</p>}
            </div>
            <button type="button" onClick={onClose} className="text-[#70757a]">
              ✕
            </button>
          </div>
          <p className="mt-4 text-sm text-[#3c4043]">
            {start.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            <br />
            {formatTime(start)} – {formatTime(end)}
          </p>
          <p className="mt-2 text-xs capitalize text-[#70757a]">Status: {event.status.replace("_", " ")}</p>
        </div>
        <div className="flex gap-2 border-t border-[#dadce0] px-5 py-3">
          {event.href && (
            <Link
              href={event.href}
              className="rounded bg-[var(--workspace-accent)] px-4 py-2 text-sm font-medium text-white"
            >
              {event.type === "session" ? "Open session" : "View tasks"}
            </Link>
          )}
          {event.memberId && (
            <Link
              href={`/app/clients/${event.memberId}`}
              className="rounded border border-[#dadce0] px-4 py-2 text-sm font-medium hover:bg-[#f1f3f4]"
            >
              Open client
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded px-4 py-2 text-sm text-[#70757a] hover:bg-[#f1f3f4]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
