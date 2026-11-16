"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button } from "@/components/ui";
import {
  GYM_PACK_MONTHS,
  displayStatusTone,
  packLabel,
  type GymMembershipDisplayStatus,
} from "@/lib/gym-membership";

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function defaultEndDate(start: string, months: number) {
  const d = new Date(`${start}T00:00:00.000Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function AddGymMembershipForm({
  members,
  centres,
  fixedMemberId,
  buttonLabel = "Add membership",
}: {
  members: { id: string; name: string; centreId: string }[];
  centres: { id: string; name: string }[];
  fixedMemberId?: string;
  buttonLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [centreId, setCentreId] = useState(centres[0]?.id ?? "");
  const [memberId, setMemberId] = useState(fixedMemberId ?? "");
  const [packMonths, setPackMonths] = useState<(typeof GYM_PACK_MONTHS)[number]>(3);
  const [startsAt, setStartsAt] = useState(todayInput());
  const [endsAt, setEndsAt] = useState(defaultEndDate(todayInput(), 3));
  const [autoEnd, setAutoEnd] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    ok: boolean;
    displayStatus?: GymMembershipDisplayStatus;
    message?: string;
  } | null>(null);

  const branchMembers = useMemo(
    () => members.filter((m) => !centreId || m.centreId === centreId),
    [members, centreId],
  );

  const resolvedMemberId =
    fixedMemberId ?? (branchMembers.some((m) => m.id === memberId) ? memberId : (branchMembers[0]?.id ?? ""));

  function onPackChange(months: number) {
    setPackMonths(months as (typeof GYM_PACK_MONTHS)[number]);
    if (autoEnd) setEndsAt(defaultEndDate(startsAt, months));
  }

  function onStartChange(value: string) {
    setStartsAt(value);
    if (autoEnd) setEndsAt(defaultEndDate(value, packMonths));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const res = await fetch("/api/gym-memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: resolvedMemberId,
        packMonths,
        startsAt,
        endsAt: autoEnd ? undefined : endsAt,
        centreId: centreId || undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setResult({ ok: false, message: data.error ?? "Pack not created" });
      setError(data.error ?? "Pack not created");
      return;
    }

    setResult({
      ok: true,
      displayStatus: data.displayStatus,
      message: data.message ?? `Pack created — ${data.displayStatus}`,
    });
    router.refresh();
  }

  if (!open) {
    return (
      <Button
        type="button"
        onClick={() => setOpen(true)}
        disabled={members.length === 0 && !fixedMemberId}
      >
        {buttonLabel}
      </Button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Screen 2 — Add membership</h2>
        <p className="mt-1 text-xs text-[var(--workspace-muted)]">
          Gym access pack (3 / 6 / 12 / 24 months). PT session packs are under Assign plan.
        </p>

        {result?.ok && (
          <div className="mt-4 rounded-lg border border-[var(--emerald-neon)]/40 bg-[var(--emerald-neon-tint)] p-3 text-sm">
            <p className="font-semibold text-[var(--status-success)]">
              Output: Pack created
              {result.displayStatus && (
                <>
                  {" — "}
                  <Badge tone={displayStatusTone(result.displayStatus)}>{result.displayStatus}</Badge>
                </>
              )}
            </p>
          </div>
        )}

        {result && !result.ok && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
            <p className="font-semibold">Output: No</p>
            <p>{result.message}</p>
          </div>
        )}

        {error && !result && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-4 space-y-3">
          {!fixedMemberId && centres.length > 0 && (
            <label className="block text-xs font-medium text-[var(--workspace-muted)]">
              Branch
              <select
                value={centreId}
                onChange={(e) => {
                  setCentreId(e.target.value);
                  const next = members.filter((m) => m.centreId === e.target.value);
                  setMemberId(next[0]?.id ?? "");
                }}
                className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
              >
                {centres.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!fixedMemberId && (
            <label className="block text-xs font-medium text-[var(--workspace-muted)]">
              Member
              <select
                required
                value={resolvedMemberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
              >
                {branchMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-xs font-medium text-[var(--workspace-muted)]">
            Pack type
            <select
              value={packMonths}
              onChange={(e) => onPackChange(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
            >
              {GYM_PACK_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {packLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-[var(--workspace-muted)]">
            Start date
            <input
              type="date"
              required
              value={startsAt}
              onChange={(e) => onStartChange(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-[var(--workspace-muted)]">
            <input
              type="checkbox"
              checked={autoEnd}
              onChange={(e) => {
                setAutoEnd(e.target.checked);
                if (e.target.checked) setEndsAt(defaultEndDate(startsAt, packMonths));
              }}
            />
            Auto end date from pack length
          </label>
          <label className="block text-xs font-medium text-[var(--workspace-muted)]">
            End date
            <input
              type="date"
              required
              disabled={autoEnd}
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm disabled:opacity-60"
            />
          </label>
        </div>

        <div className="mt-6 flex gap-2">
          <Button type="submit" disabled={loading || !resolvedMemberId}>
            {loading ? "Saving…" : "Create pack"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </div>
    </form>
  );
}