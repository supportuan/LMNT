"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ASSET_STATUS_LABEL, ASSET_UI_STATUSES, assetUiStatus, assetUiToDb } from "@/lib/asset-status";

export function AssetStatusEditor({
  assetId,
  currentStatus,
  assignedArea,
  assignedTrainerId,
  retiredAt,
}: {
  assetId: string;
  currentStatus: string;
  assignedArea?: string | null;
  assignedTrainerId?: string | null;
  retiredAt?: Date | string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(
    assetUiStatus({ status: currentStatus, assignedArea, assignedTrainerId, retiredAt }),
  );
  const [loading, setLoading] = useState(false);

  async function update(next: string) {
    const mapped = assetUiToDb(next as (typeof ASSET_UI_STATUSES)[number]);
    setLoading(true);
    setStatus(next as (typeof ASSET_UI_STATUSES)[number]);
    await fetch(`/api/assets/${assetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: mapped.status,
        assignedArea: mapped.assignedArea,
        retiredAt: mapped.retiredAt ? mapped.retiredAt.toISOString() : null,
      }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <select
      value={status}
      disabled={loading}
      aria-label="Update asset status"
      onChange={(e) => update(e.target.value)}
      className="neu-input max-w-[160px] py-1.5 text-xs capitalize"
    >
      {ASSET_UI_STATUSES.map((item) => (
        <option key={item} value={item}>
          {ASSET_STATUS_LABEL[item]}
        </option>
      ))}
    </select>
  );
}
