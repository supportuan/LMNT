"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { formatInr } from "@/lib/format";
import { applyShareBps, bpsToPercent } from "@/lib/trainer-share";

export function AssignMembershipForm({
  centres,
  members,
  trainers,
  packages,
}: {
  centres: { id: string; name: string }[];
  members: { id: string; name: string; centreId: string }[];
  trainers: { id: string; name: string; centreId: string | null }[];
  packages: { id: string; name: string; sessionCount: number; priceInr: number; trainerShareBps: number }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [centreId, setCentreId] = useState(centres[0]?.id ?? "");
  const [memberId, setMemberId] = useState("");
  const [packageId, setPackageId] = useState(packages[0]?.id ?? "");
  const [trainerId, setTrainerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const branchMembers = useMemo(
    () => members.filter((member) => !centreId || member.centreId === centreId),
    [members, centreId],
  );
  const branchTrainers = useMemo(
    () => trainers.filter((trainer) => !centreId || trainer.centreId == null || trainer.centreId === centreId),
    [trainers, centreId],
  );
  const selected = packages.find((pkg) => pkg.id === packageId);
  const resolvedMemberId = branchMembers.some((member) => member.id === memberId)
    ? memberId
    : (branchMembers[0]?.id ?? "");
  const resolvedTrainerId = branchTrainers.some((trainer) => trainer.id === trainerId)
    ? trainerId
    : (branchTrainers[0]?.id ?? "");

  function changeBranch(nextCentreId: string) {
    setCentreId(nextCentreId);
    const nextMembers = members.filter((member) => member.centreId === nextCentreId);
    const nextTrainers = trainers.filter((trainer) => trainer.centreId == null || trainer.centreId === nextCentreId);
    setMemberId(nextMembers[0]?.id ?? "");
    setTrainerId(nextTrainers[0]?.id ?? "");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/member-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: resolvedMemberId,
        packageId,
        trainerId: resolvedTrainerId || undefined,
        centreId: centreId || undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to assign plan");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)} disabled={members.length === 0 || packages.length === 0}>
        Assign plan
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
        className="w-full max-w-md rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Assign membership</h2>
        <p className="mt-1 text-sm text-[var(--workspace-muted)]">
          Pick the branch first. The trainer at that branch receives the catalog share of collections.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-medium text-[var(--workspace-muted)]">
            Branch
            <select
              required
              value={centreId}
              onChange={(e) => changeBranch(e.target.value)}
              className="neu-input mt-1 w-full"
            >
              {centres.map((centre) => (
                <option key={centre.id} value={centre.id}>
                  {centre.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-[var(--workspace-muted)]">
            Member
            <select
              required
              value={resolvedMemberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="neu-input mt-1 w-full"
              disabled={branchMembers.length === 0}
            >
              {branchMembers.length === 0 ? (
                <option value="">No members at this branch</option>
              ) : (
                branchMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="block text-xs font-medium text-[var(--workspace-muted)]">
            Plan
            <select required value={packageId} onChange={(e) => setPackageId(e.target.value)} className="neu-input mt-1 w-full">
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} · {pkg.sessionCount} sessions · {formatInr(pkg.priceInr)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-[var(--workspace-muted)]">
            Trainer
            <select value={resolvedTrainerId} onChange={(e) => setTrainerId(e.target.value)} className="neu-input mt-1 w-full">
              <option value="">No trainer</option>
              {branchTrainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.name}
                </option>
              ))}
            </select>
          </label>
          {selected && (
            <p className="text-xs text-[var(--workspace-muted)]">
              Trainer share {bpsToPercent(selected.trainerShareBps)}% · {formatInr(applyShareBps(selected.priceInr, selected.trainerShareBps))} when paid in full
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-4 flex gap-2">
          <Button type="submit" disabled={loading || !resolvedMemberId}>
            {loading ? "Saving…" : "Assign plan"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
