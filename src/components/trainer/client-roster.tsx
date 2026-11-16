"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SessionDoneButton } from "@/components/coach-os/session-done";
import { Badge, Button, EmptyState } from "@/components/ui";
import { formatDayList, parseDayList } from "@/lib/coach-life/timetable";
import { sendJson } from "@/lib/send-json";
import type { TrainerClientCard } from "@/modules/trainer-queries";

type Filter = "active" | "follow-up" | "due" | "low" | "inactive";

const FILTERS: { id: Filter; label: string; test: (c: TrainerClientCard) => boolean }[] = [
  { id: "active", label: "Active", test: (c) => c.status === "active" },
  { id: "follow-up", label: "Follow-up", test: (c) => c.status === "active" && c.needsFollowUp },
  { id: "due", label: "Payment due", test: (c) => c.status === "active" && (c.amountDue ?? 0) > 0 },
  {
    id: "low",
    label: "Low sessions",
    test: (c) => c.status === "active" && c.sessionsRemaining !== null && c.sessionsRemaining <= 3,
  },
  { id: "inactive", label: "Inactive", test: (c) => c.status !== "active" },
];

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function ClientRoster({
  clients,
  initialFilter,
}: {
  clients: TrainerClientCard[];
  initialFilter?: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>(
    FILTERS.some((f) => f.id === initialFilter) ? (initialFilter as Filter) : "active",
  );

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.id, clients.filter(f.test).length])) as Record<Filter, number>,
    [clients],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const test = FILTERS.find((f) => f.id === filter)!.test;
    return clients.filter((c) => {
      if (!test(c)) return false;
      if (!q) return true;
      return [c.name, c.goal, c.email, c.phone].some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [clients, filter, query]);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, goal, phone…"
          aria-label="Search clients"
          className="neu-input max-w-sm"
        />
        <div className="neu-inset flex flex-wrap gap-1 rounded-[14px] p-1.5" role="tablist" aria-label="Filter clients">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.id)}
                className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-[var(--workspace-accent)] text-[var(--workspace-accent-text)]"
                    : "text-[var(--workspace-muted)] hover:text-[var(--workspace-text)]"
                }`}
              >
                {f.label}
                <span className="ml-1.5 tabular-nums opacity-70">{counts[f.id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={clients.length === 0 ? "No clients yet" : "No clients match"}
          description={
            clients.length === 0
              ? "Add your first client to start building your weekly rhythm."
              : "Try a different search or filter."
          }
        />
      ) : (
        <div className="grid gap-[var(--grid-gutter)] sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((c) => (
            <ClientCard key={c.id} client={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClientCard({ client: c }: { client: TrainerClientCard }) {
  const router = useRouter();
  const [followUp, setFollowUp] = useState(c.needsFollowUp);
  const [busy, setBusy] = useState(false);
  const due = c.amountDue ?? 0;
  const low = c.sessionsRemaining !== null && c.sessionsRemaining <= 3;
  const days = c.trainingDays ? formatDayList(parseDayList(c.trainingDays)) : "";
  const rhythm = [days, c.trainingTime].filter(Boolean).join(" · ");

  async function toggleFollowUp() {
    const next = !followUp;
    setFollowUp(next);
    setBusy(true);
    const res = await sendJson("/api/coaching-relationships", "PATCH", { memberId: c.id, needsFollowUp: next });
    setBusy(false);
    if (!res.ok) setFollowUp(!next);
    else router.refresh();
  }

  return (
    <article className="neu-card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/app/clients/${c.id}`} className="block truncate text-lg font-bold hover:text-[var(--emerald-neon)]">
            {c.name}
          </Link>
          <div className="mt-0.5 truncate text-sm text-[var(--workspace-muted)]">{c.goal ?? "Goal not set"}</div>
          {c.phone && (
            <a href={`tel:${c.phone}`} className="mt-0.5 block text-xs text-[var(--workspace-subtle)] hover:text-[var(--workspace-text)]">
              {c.phone}
            </a>
          )}
        </div>
        {followUp && <Badge tone="warning">Follow-up</Badge>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone={low ? "warning" : "success"}>
          {c.sessionsRemaining === null
            ? "No package"
            : `${c.sessionsRemaining}${c.totalSessions ? `/${c.totalSessions}` : ""} sessions left`}
        </Badge>
        <Badge tone={due > 0 ? "danger" : "neutral"}>{due > 0 ? `${inr(due)} due` : "Paid up"}</Badge>
        {c.progressStatus !== "on_track" && (
          <Badge tone={c.progressStatus === "at_risk" ? "danger" : "warning"}>
            {c.progressStatus === "at_risk" ? "At risk" : "Needs review"}
          </Badge>
        )}
      </div>

      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--workspace-muted)]">Next session</dt>
          <dd className="text-right font-medium">
            {c.nextSession
              ? new Date(c.nextSession).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" })
              : "Not scheduled"}
          </dd>
        </div>
        {rhythm && (
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--workspace-muted)]">Rhythm</dt>
            <dd className="truncate text-right font-medium">{rhythm}</dd>
          </div>
        )}
      </dl>

      {c.lastNote && (
        <p className="mt-3 line-clamp-2 rounded-[10px] bg-[var(--moss-tint)] px-3 py-2 text-xs text-[var(--workspace-secondary-muted)]">
          {c.lastNote}
        </p>
      )}

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <Button href={`/app/calendar?book=${c.id}`} variant="secondary" size="sm">
          Book
        </Button>
        {c.status === "active" && <SessionDoneButton memberId={c.id} memberName={c.name} label="Session Done" />}
        <Button type="button" variant="ghost" size="sm" onClick={toggleFollowUp} disabled={busy}>
          {followUp ? "Clear follow-up" : "Follow-up"}
        </Button>
      </div>
    </article>
  );
}
