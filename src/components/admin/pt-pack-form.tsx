"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { toDatetimeLocalValue } from "@/lib/calendar-utils";

const VALIDITY = [1, 3, 6, 12] as const;
const inputClass = "neu-input mt-1 w-full";

export function PtPackForm({
  centres,
  members,
  trainers,
  packages,
  initialMemberId,
}: {
  centres: { id: string; name: string }[];
  members: { id: string; name: string; centreId: string }[];
  trainers: { id: string; name: string; centreId: string | null }[];
  packages: { id: string; name: string; sessionCount: number; priceInr: number }[];
  initialMemberId?: string;
}) {
  const router = useRouter();
  const [centreId, setCentreId] = useState(centres[0]?.id ?? "");
  const [memberId, setMemberId] = useState(initialMemberId ?? members[0]?.id ?? "");
  const [packageId, setPackageId] = useState(packages[0]?.id ?? "");
  const [trainerId, setTrainerId] = useState("");
  const [validityMonths, setValidityMonths] = useState<(typeof VALIDITY)[number]>(3);
  const [startsAt, setStartsAt] = useState(toDatetimeLocalValue(new Date()).slice(0, 10));
  const [trainingDays, setTrainingDays] = useState("Mon, Wed, Fri");
  const [trainingTime, setTrainingTime] = useState("7–8am");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  const branchMembers = useMemo(
    () => members.filter((m) => !centreId || m.centreId === centreId),
    [members, centreId],
  );
  const branchTrainers = useMemo(
    () => trainers.filter((t) => !centreId || !t.centreId || t.centreId === centreId),
    [trainers, centreId],
  );
  const selectedPkg = packages.find((p) => p.id === packageId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult("");

    const res = await fetch("/api/pt-packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        packageId,
        trainerId,
        centreId,
        startsAt,
        validityMonths,
        trainingDays,
        trainingTime,
        renew: true,
      }),
    });

    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed");
      setResult("Output: No");
      return;
    }
    setResult(data.output ?? "Output: PT pack created");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {!initialMemberId && (
        <>
          <label className="block text-xs font-medium text-[var(--workspace-muted)]">
            Branch
            <select value={centreId} onChange={(e) => setCentreId(e.target.value)} className={inputClass}>
              {centres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-[var(--workspace-muted)]">
            Member
            <select required value={memberId} onChange={(e) => setMemberId(e.target.value)} className={inputClass}>
              {branchMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      <label className="block text-xs font-medium text-[var(--workspace-muted)]">
        PT pack type
        <select required value={packageId} onChange={(e) => setPackageId(e.target.value)} className={inputClass}>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.sessionCount} sessions · ₹{p.priceInr.toLocaleString("en-IN")}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs font-medium text-[var(--workspace-muted)]">
        Trainer
        <select required value={trainerId} onChange={(e) => setTrainerId(e.target.value)} className={inputClass}>
          <option value="">Select trainer…</option>
          {branchTrainers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-[var(--workspace-muted)]">
          Validity (months)
          <select
            value={validityMonths}
            onChange={(e) => setValidityMonths(Number(e.target.value) as (typeof VALIDITY)[number])}
            className={inputClass}
          >
            {VALIDITY.map((m) => (
              <option key={m} value={m}>
                {m}m
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-[var(--workspace-muted)]">
          Start date
          <input required type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} />
        </label>
      </div>

      <label className="block text-xs font-medium text-[var(--workspace-muted)]">
        Days
        <input
          required
          value={trainingDays}
          onChange={(e) => setTrainingDays(e.target.value)}
          placeholder="Mon, Wed, Fri"
          className={inputClass}
        />
      </label>
      <label className="block text-xs font-medium text-[var(--workspace-muted)]">
        Timing
        <input
          required
          value={trainingTime}
          onChange={(e) => setTrainingTime(e.target.value)}
          placeholder="7–8am"
          className={inputClass}
        />
      </label>

      {selectedPkg && (
        <p className="text-xs text-[var(--workspace-muted)]">
          Will place up to {selectedPkg.sessionCount} PT sessions on the trainer&apos;s calendar using days and time above.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <p className={`text-sm font-semibold ${result.includes("No") ? "text-[var(--status-danger)]" : "text-[var(--status-success)]"}`}>
          {result}
        </p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create / renew PT pack"}
      </Button>
    </form>
  );
}