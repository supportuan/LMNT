"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

type CatalogPackage = {
  name: string;
  sessionCount: number;
  priceInr: number;
  trainerShareBps: number;
};

export function NewClientForm({
  defaultOpen = false,
  centres = [],
  trainers = [],
  packages = [],
  buttonLabel = "Add Client",
}: {
  defaultOpen?: boolean;
  centres?: { id: string; name: string }[];
  trainers?: { id: string; name: string; centreId?: string | null }[];
  packages?: CatalogPackage[];
  buttonLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [goal, setGoal] = useState("");
  const [planName, setPlanName] = useState(packages[0]?.name ?? "PT Package");
  const [totalSessions, setTotalSessions] = useState(String(packages[0]?.sessionCount ?? 12));
  const [packageValue, setPackageValue] = useState(packages[0] ? String(packages[0].priceInr) : "");
  const [amountDue, setAmountDue] = useState(packages[0] ? String(packages[0].priceInr) : "");
  const [trainerShareBps, setTrainerShareBps] = useState(packages[0]?.trainerShareBps ?? 5000);
  const [centreId, setCentreId] = useState(centres[0]?.id ?? "");
  const [trainerId, setTrainerId] = useState(trainers[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function applyPackage(pkg: CatalogPackage) {
    setPlanName(pkg.name);
    setTotalSessions(String(pkg.sessionCount));
    setPackageValue(String(pkg.priceInr));
    setAmountDue(String(pkg.priceInr));
    setTrainerShareBps(pkg.trainerShareBps);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email: email || undefined,
        goal: goal || undefined,
        planName: planName || undefined,
        totalSessions: totalSessions ? Number(totalSessions) : undefined,
        packageValue: packageValue ? Number(packageValue) : undefined,
        amountDue: amountDue ? Number(amountDue) : undefined,
        trainerShareBps,
        centreId: centreId || undefined,
        trainerId: trainerId || undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create client");
      return;
    }
    const data = await res.json();
    setOpen(false);
    router.push(`/app/clients/${data.member.id}`);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
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
        className="w-full max-w-md rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{buttonLabel === "Add member" ? "New member" : "New client"}</h2>
        <div className="mt-4 space-y-3">
          {centres.length > 0 && (
            <label className="block text-xs font-medium text-[var(--workspace-muted)]">
              Branch
              <select
                required
                value={centreId}
                onChange={(e) => {
                  const next = e.target.value;
                  setCentreId(next);
                  const nextTrainer = trainers.find((trainer) => !trainer.centreId || trainer.centreId === next);
                  if (nextTrainer) setTrainerId(nextTrainer.id);
                }}
                className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
              >
                {centres.map((centre) => (
                  <option key={centre.id} value={centre.id}>
                    {centre.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {trainers.length > 0 && (
            <label className="block text-xs font-medium text-[var(--workspace-muted)]">
              Trainer
              <select
                required
                value={trainerId}
                onChange={(e) => setTrainerId(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
              >
                {(centreId
                  ? trainers.filter((trainer) => !trainer.centreId || trainer.centreId === centreId)
                  : trainers
                ).map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <input
            required
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
          />
          <input
            type="email"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
          />
          <input
            placeholder="Primary goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
          />
          {packages.length > 0 ? (
            <select
              required
              value={planName}
              onChange={(e) => {
                const selected = packages.find((pkg) => pkg.name === e.target.value);
                if (selected) applyPackage(selected);
                else setPlanName(e.target.value);
              }}
              className="w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
            >
              {packages.map((pkg) => (
                <option key={pkg.name} value={pkg.name}>
                  {pkg.name} · {pkg.sessionCount} sessions · ₹{pkg.priceInr.toLocaleString("en-IN")}
                </option>
              ))}
            </select>
          ) : (
            <input
              placeholder="Plan name"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
            />
          )}
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              min={1}
              placeholder="Sessions"
              value={totalSessions}
              onChange={(e) => setTotalSessions(e.target.value)}
              className="w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              placeholder="Package ₹"
              value={packageValue}
              onChange={(e) => setPackageValue(e.target.value)}
              className="w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              placeholder="Due ₹"
              value={amountDue}
              onChange={(e) => setAmountDue(e.target.value)}
              className="w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-4 flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : buttonLabel === "Add member" ? "Create member" : "Create client"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
