"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Modal, fieldClass } from "@/components/ui";
import { ASSET_STATUS_LABEL, ASSET_UI_STATUSES, assetUiToDb } from "@/lib/asset-status";

type CentreOption = { id: string; name: string };

export function AddAssetForm({
  centres,
  trainers = [],
}: {
  centres: CentreOption[];
  trainers?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("strength");
  const [serialNumber, setSerialNumber] = useState("");
  const [location, setLocation] = useState("");
  const [uiStatus, setUiStatus] = useState("available");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [warrantyUntil, setWarrantyUntil] = useState("");
  const [assignedTrainerId, setAssignedTrainerId] = useState("");
  const [lastServiceAt, setLastServiceAt] = useState("");
  const [nextMaintenanceAt, setNextMaintenanceAt] = useState("");
  const [centreId, setCentreId] = useState(centres[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setName("");
    setCategory("strength");
    setSerialNumber("");
    setLocation("");
    setUiStatus("available");
    setPurchaseDate("");
    setPurchaseCost("");
    setWarrantyUntil("");
    setAssignedTrainerId("");
    setLastServiceAt("");
    setNextMaintenanceAt("");
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const mapped = assetUiToDb(uiStatus as (typeof ASSET_UI_STATUSES)[number]);

    const res = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        category,
        serialNumber: serialNumber || null,
        location: location || null,
        status: mapped.status,
        assignedArea: mapped.assignedArea,
        assignedTrainerId: assignedTrainerId || null,
        purchaseDate: purchaseDate || null,
        purchaseCost: purchaseCost ? Number(purchaseCost) : null,
        warrantyUntil: warrantyUntil || null,
        lastServiceAt: lastServiceAt || null,
        nextMaintenanceAt: nextMaintenanceAt || null,
        centreId: centreId || centres[0]?.id,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to add asset");
      return;
    }

    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Add Asset
      </Button>
      {open && (
        <Modal title="Add Asset" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-3">
            {centres.length > 1 && (
              <select required value={centreId} onChange={(e) => setCentreId(e.target.value)} className={fieldClass}>
                {centres.map((centre) => (
                  <option key={centre.id} value={centre.id}>
                    {centre.name}
                  </option>
                ))}
              </select>
            )}
            <input required placeholder="Asset name" value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
            <input placeholder="Category (strength, cardio, recovery)" value={category} onChange={(e) => setCategory(e.target.value)} className={fieldClass} />
            <input placeholder="Asset ID / serial" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className={fieldClass} />
            <input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className={fieldClass} />
            {trainers.length > 0 && (
              <select value={assignedTrainerId} onChange={(e) => setAssignedTrainerId(e.target.value)} className={fieldClass}>
                <option value="">Assigned trainer (optional)</option>
                {trainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.name}
                  </option>
                ))}
              </select>
            )}
            <select value={uiStatus} onChange={(e) => setUiStatus(e.target.value)} className={fieldClass}>
              {ASSET_UI_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {ASSET_STATUS_LABEL[status]}
                </option>
              ))}
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-[11px] uppercase tracking-wide text-[var(--workspace-muted)]">
                Purchase date
                <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className={`${fieldClass} mt-1`} />
              </label>
              <label className="text-[11px] uppercase tracking-wide text-[var(--workspace-muted)]">
                Purchase cost
                <input type="number" min={0} placeholder="INR" value={purchaseCost} onChange={(e) => setPurchaseCost(e.target.value)} className={`${fieldClass} mt-1`} />
              </label>
              <label className="text-[11px] uppercase tracking-wide text-[var(--workspace-muted)]">
                Warranty
                <input type="date" value={warrantyUntil} onChange={(e) => setWarrantyUntil(e.target.value)} className={`${fieldClass} mt-1`} />
              </label>
              <label className="text-[11px] uppercase tracking-wide text-[var(--workspace-muted)]">
                Last maintenance
                <input type="date" value={lastServiceAt} onChange={(e) => setLastServiceAt(e.target.value)} className={`${fieldClass} mt-1`} />
              </label>
              <label className="sm:col-span-2 text-[11px] uppercase tracking-wide text-[var(--workspace-muted)]">
                Next maintenance
                <input type="date" value={nextMaintenanceAt} onChange={(e) => setNextMaintenanceAt(e.target.value)} className={`${fieldClass} mt-1`} />
              </label>
            </div>
            {error && <p className="text-sm text-[var(--status-danger)]">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Add Asset"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
