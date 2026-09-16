"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

type CentreOption = { id: string; name: string };

const inputClass =
  "w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm";

export function AddInventoryForm({ centres }: { centres: CentreOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("5");
  const [unit, setUnit] = useState("units");
  const [centreId, setCentreId] = useState(centres[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        sku: sku || undefined,
        quantity: Number(quantity),
        reorderLevel: Number(reorderLevel),
        unit,
        centreId: centreId || centres[0]?.id,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to add item");
      return;
    }

    setOpen(false);
    setName("");
    setSku("");
    setQuantity("0");
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        + Add item
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
        <h2 className="text-lg font-semibold">Add inventory item</h2>
        <div className="mt-4 space-y-3">
          {centres.length > 1 && (
            <select
              required
              value={centreId}
              onChange={(e) => setCentreId(e.target.value)}
              className={inputClass}
            >
              {centres.map((centre) => (
                <option key={centre.id} value={centre.id}>
                  {centre.name}
                </option>
              ))}
            </select>
          )}
          <input
            required
            placeholder="Item name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <input
            placeholder="SKU (optional)"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className={inputClass}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              type="number"
              min={0}
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputClass}
            />
            <input
              required
              type="number"
              min={0}
              placeholder="Reorder at"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              className={inputClass}
            />
          </div>
          <input
            placeholder="Unit (e.g. bottles, rolls)"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className={inputClass}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-4 flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Add item"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
