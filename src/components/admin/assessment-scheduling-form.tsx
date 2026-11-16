"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/calendar-utils";

type Member = { id: string; name: string; centreId: string; goal?: string | null };
type Trainer = { id: string; name: string; centreId: string | null };
type Slot = { startsAt: string; endsAt: string; label: string; free: boolean };

const inputClass =
  "w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm";

function defaultDatetime() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 2);
  return toDatetimeLocalValue(d);
}

export function AssessmentSchedulingForm({
  members,
  trainers,
  initialMemberId,
  compact,
}: {
  members: Member[];
  trainers: Trainer[];
  initialMemberId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [memberId, setMemberId] = useState(initialMemberId ?? members[0]?.id ?? "");
  const [trainerId, setTrainerId] = useState("");
  const [goals, setGoals] = useState("");
  const [datetime, setDatetime] = useState(defaultDatetime);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  const member = useMemo(() => members.find((m) => m.id === memberId), [members, memberId]);

  const filteredTrainers = useMemo(() => {
    if (!member) return trainers;
    return trainers.filter((t) => !t.centreId || t.centreId === member.centreId);
  }, [trainers, member]);

  useEffect(() => {
    if (member?.goal && !goals) setGoals(member.goal);
  }, [member, goals]);

  const loadSlots = useCallback(async () => {
    if (!trainerId) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    const res = await fetch(`/api/assessment-scheduling?trainerId=${trainerId}`);
    const data = await res.json();
    setLoadingSlots(false);
    if (res.ok) {
      setSlots(data.slots ?? []);
    }
  }, [trainerId]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  function pickSlot(iso: string) {
    setDatetime(toDatetimeLocalValue(new Date(iso)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setResult("");

    const res = await fetch("/api/assessment-scheduling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        trainerId,
        goals: goals.trim(),
        scheduledAt: fromDatetimeLocalValue(datetime).toISOString(),
      }),
    });

    setSubmitting(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not schedule assessment");
      setResult("Output: No");
      return;
    }

    setResult(data.output ?? "Output: Assessment scheduled");
    router.refresh();
  }

  const freeSlots = slots.filter((s) => s.free).slice(0, 12);

  return (
    <form onSubmit={submit} className="space-y-4">
      {!compact && (
        <p className="text-sm text-[var(--workspace-muted)]">
          Pick a trainer and slot — a consultation lead lands on their pipeline with goals and assessment time.
        </p>
      )}

      {!initialMemberId && (
        <label className="block text-sm font-medium">
          Member
          <select
            required
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className={`${inputClass} mt-1`}
          >
            <option value="">Select member…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-sm font-medium">
        Trainer
        <select
          required
          value={trainerId}
          onChange={(e) => setTrainerId(e.target.value)}
          className={`${inputClass} mt-1`}
        >
          <option value="">Select trainer…</option>
          {filteredTrainers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      {trainerId ? (
        <FreeSlotsPanel
          loading={loadingSlots}
          freeSlots={freeSlots}
          onPick={pickSlot}
        />
      ) : null}

      <label className="block text-sm font-medium">
        Assessment date & time
        <input
          required
          type="datetime-local"
          value={datetime}
          onChange={(e) => setDatetime(e.target.value)}
          className={`${inputClass} mt-1`}
        />
      </label>

      <label className="block text-sm font-medium">
        Goals
        <textarea
          required
          rows={3}
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          placeholder="Fat loss, strength, rehab, event prep…"
          className={`${inputClass} mt-1`}
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <p className={`text-sm font-semibold ${result.includes("No") ? "text-[var(--status-danger)]" : "text-[var(--status-success)]"}`}>
          {result}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting || !memberId || !trainerId}>
          {submitting ? "Scheduling…" : "Schedule assessment"}
        </Button>
        {trainerId ? (
          <Button type="button" variant="secondary" onClick={() => void loadSlots()} disabled={loadingSlots}>
            Refresh slots
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function FreeSlotsPanel({
  loading,
  freeSlots,
  onPick,
}: {
  loading: boolean;
  freeSlots: Slot[];
  onPick: (iso: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium">Free slots this week</div>
      {loading ? (
        <p className="text-xs text-[var(--workspace-muted)]">Loading roster…</p>
      ) : freeSlots.length === 0 ? (
        <p className="text-xs text-[var(--workspace-muted)]">
          No open client blocks this week — pick any time below or ask the trainer to add timetable slots in Me.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {freeSlots.map((slot) => (
            <button
              key={slot.startsAt}
              type="button"
              onClick={() => onPick(slot.startsAt)}
              className="rounded-md border border-[var(--workspace-border)] px-2 py-1 text-xs hover:border-[var(--workspace-accent)]"
            >
              {new Date(slot.startsAt).toLocaleString(undefined, {
                weekday: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
              <span className="ml-1 text-[var(--status-success)]">free</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}