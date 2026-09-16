"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Panel } from "@/components/ui";
import type { ModerationReportRow } from "@/modules/community-queries";

const STATUS_TONE: Record<string, "info" | "warning" | "success" | "danger" | "neutral"> = {
  pending: "warning",
  escalated: "danger",
  dismissed: "neutral",
  action_taken: "success",
};

export function ModerationPanel({ reports }: { reports: ModerationReportRow[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [resolution, setResolution] = useState<Record<string, string>>({});

  async function resolveReport(id: string, status: "dismissed" | "action_taken" | "escalated") {
    const note = resolution[id]?.trim();
    if (!note) return;
    setLoadingId(id);
    await fetch(`/api/message-reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, resolution: note }),
    });
    setLoadingId(null);
    router.refresh();
  }

  const open = reports.filter((r) => r.status === "pending" || r.status === "escalated");

  return (
    <div className="space-y-4">
      {open.length === 0 ? (
        <Panel>
          <p className="text-sm text-[var(--workspace-muted)]">No open moderation reports.</p>
        </Panel>
      ) : (
        open.map((report) => (
          <Panel key={report.id}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-semibold">{report.memberName}</div>
                <div className="text-xs text-[var(--workspace-muted)]">
                  Reported by {report.reporterName} · {new Date(report.createdAt).toLocaleString()}
                </div>
              </div>
              <Badge tone={STATUS_TONE[report.status] ?? "neutral"}>{report.status}</Badge>
            </div>

            <div className="mb-3 rounded-xl bg-[var(--workspace-bg)] p-3 text-sm">
              <div className="mb-1 text-xs font-semibold uppercase text-[var(--workspace-muted)]">
                Flagged message
              </div>
              {report.messageBody}
            </div>

            <p className="mb-3 text-sm">
              <span className="font-medium">Reason:</span> {report.reason}
            </p>

            <input
              className="mb-3 w-full rounded-xl border border-[var(--workspace-border)] px-3 py-2 text-sm"
              placeholder="Resolution notes"
              value={resolution[report.id] ?? ""}
              onChange={(e) => setResolution((prev) => ({ ...prev, [report.id]: e.target.value }))}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={loadingId === report.id}
                onClick={() => resolveReport(report.id, "dismissed")}
              >
                Dismiss
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={loadingId === report.id}
                onClick={() => resolveReport(report.id, "escalated")}
              >
                Escalate
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={loadingId === report.id}
                onClick={() => resolveReport(report.id, "action_taken")}
              >
                Remove message
              </Button>
            </div>
          </Panel>
        ))
      )}
    </div>
  );
}
