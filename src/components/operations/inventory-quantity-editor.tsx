"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function InventoryQuantityEditor({
  itemId,
  quantity,
  reorderLevel,
  unit,
}: {
  itemId: string;
  quantity: number;
  reorderLevel: number;
  unit: string;
}) {
  const router = useRouter();
  const [qty, setQty] = useState(quantity);
  const [reorder, setReorder] = useState(reorderLevel);
  const [loading, setLoading] = useState(false);

  async function save(nextQty: number, nextReorder: number) {
    setLoading(true);
    await fetch(`/api/inventory/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: nextQty, reorderLevel: nextReorder }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        value={qty}
        disabled={loading}
        onChange={(e) => setQty(Number(e.target.value))}
        onBlur={() => {
          if (qty !== quantity || reorder !== reorderLevel) save(qty, reorder);
        }}
        className="w-16 rounded border border-[var(--workspace-border)] bg-[var(--workspace-elevated)] px-2 py-1 text-xs tabular-nums"
      />
      <span className="text-[11px] text-[var(--workspace-muted)]">{unit}</span>
      <span className="text-[11px] text-[var(--workspace-muted)]">· reorder</span>
      <input
        type="number"
        min={0}
        value={reorder}
        disabled={loading}
        onChange={(e) => setReorder(Number(e.target.value))}
        onBlur={() => {
          if (qty !== quantity || reorder !== reorderLevel) save(qty, reorder);
        }}
        className="w-14 rounded border border-[var(--workspace-border)] bg-[var(--workspace-elevated)] px-2 py-1 text-xs tabular-nums"
      />
    </div>
  );
}
