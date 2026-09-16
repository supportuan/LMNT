"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, DataTable, Panel } from "@/components/ui";
import { formatInr } from "@/lib/format";
import { applyShareBps, bpsToPercent, percentToBps } from "@/lib/trainer-share";

export type OrgPackage = {
  id: string;
  name: string;
  sessionCount: number;
  priceInr: number;
  trainerShareBps: number;
  description: string | null;
  active: boolean;
  memberCount?: number;
};

export function OrgPackagesAdmin({
  packages,
  title = "Membership plans",
  description,
}: {
  packages: OrgPackage[];
  title?: string;
  description?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sessions, setSessions] = useState("12");
  const [price, setPrice] = useState("");
  const [trainerShare, setTrainerShare] = useState("50");
  const [planDescription, setPlanDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function addPackage(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/org-packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        sessionCount: Number(sessions),
        priceInr: Number(price),
        trainerShareBps: percentToBps(Number(trainerShare)),
        description: planDescription || undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create plan");
      return;
    }
    setName("");
    setPrice("");
    setPlanDescription("");
    setTrainerShare("50");
    router.refresh();
  }

  async function toggleActive(pkg: OrgPackage) {
    setToggling(pkg.id);
    await fetch("/api/org-packages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pkg.id, active: !pkg.active }),
    });
    setToggling(null);
    router.refresh();
  }

  async function saveShare(pkg: OrgPackage, percent: number) {
    const trainerShareBps = percentToBps(percent);
    if (trainerShareBps === pkg.trainerShareBps) return;
    setSavingId(pkg.id);
    await fetch("/api/org-packages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pkg.id, trainerShareBps }),
    });
    setSavingId(null);
    router.refresh();
  }

  async function savePrice(pkg: OrgPackage, priceInr: number) {
    if (!Number.isFinite(priceInr) || priceInr === pkg.priceInr) return;
    setSavingId(pkg.id);
    await fetch("/api/org-packages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pkg.id, priceInr }),
    });
    setSavingId(null);
    router.refresh();
  }

  return (
    <Panel
      title={title}
      action={<span className="text-xs text-[var(--workspace-muted)]">{packages.filter((p) => p.active).length} active</span>}
    >
      {description && <p className="mb-4 text-sm text-[var(--workspace-muted)]">{description}</p>}
      <DataTable
        headers={["Plan", "Sessions", "Price", "Trainer share", "Members", "Status", ""]}
        rows={packages.map((p) => [
          <div key={p.id}>
            <div className="font-medium">{p.name}</div>
            {p.description && <div className="text-[11px] text-[var(--workspace-muted)]">{p.description}</div>}
          </div>,
          p.sessionCount,
          <input
            key={`${p.id}-price`}
            type="number"
            min={0}
            defaultValue={p.priceInr}
            disabled={savingId === p.id}
            onBlur={(e) => void savePrice(p, Number(e.target.value))}
            className="neu-input w-28 py-1 text-xs"
          />,
          <div key={`${p.id}-share`} className="flex flex-col gap-1">
            <input
              type="number"
              min={0}
              max={100}
              defaultValue={bpsToPercent(p.trainerShareBps)}
              disabled={savingId === p.id}
              onBlur={(e) => void saveShare(p, Number(e.target.value))}
              className="neu-input w-16 py-1 text-xs"
              title="Trainer share %"
            />
            <span className="text-[11px] text-[var(--workspace-muted)]">
              {formatInr(applyShareBps(p.priceInr, p.trainerShareBps))} to trainer
            </span>
          </div>,
          p.memberCount ?? "—",
          <Badge key={`${p.id}-status`} tone={p.active ? "success" : "neutral"}>
            {p.active ? "Active" : "Inactive"}
          </Badge>,
          <Button
            key={`${p.id}-toggle`}
            type="button"
            size="sm"
            variant="secondary"
            disabled={toggling === p.id}
            onClick={() => void toggleActive(p)}
          >
            {p.active ? "Disable" : "Enable"}
          </Button>,
        ])}
      />
      <form onSubmit={addPackage} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <input
          required
          placeholder="Plan name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="neu-input"
        />
        <input
          placeholder="Description"
          value={planDescription}
          onChange={(e) => setPlanDescription(e.target.value)}
          className="neu-input"
        />
        <input
          type="number"
          min={1}
          placeholder="Sessions"
          value={sessions}
          onChange={(e) => setSessions(e.target.value)}
          className="neu-input"
        />
        <input
          type="number"
          min={0}
          required
          placeholder="Price ₹"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="neu-input"
        />
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          required
          placeholder="Trainer %"
          value={trainerShare}
          onChange={(e) => setTrainerShare(e.target.value)}
          className="neu-input"
          title="Trainer share of package price"
        />
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Saving…" : "Add plan"}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Panel>
  );
}
