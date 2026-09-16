"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Panel } from "@/components/ui";
import type { WorkRequestRow } from "@/modules/operations-queries";

const PRIORITY_TONE: Record<string, "danger" | "warning" | "info" | "neutral"> = {
  urgent: "danger",
  high: "warning",
  normal: "info",
  low: "neutral",
};

const STATUS_TONE: Record<string, "info" | "warning" | "success" | "danger" | "neutral"> = {
  submitted: "info",
  approved: "warning",
  in_progress: "warning",
  completed: "success",
  rejected: "danger",
  cancelled: "neutral",
};

export function WorkRequestsPanel({
  requests,
  canApprove,
  assets,
  centres,
}: {
  requests: WorkRequestRow[];
  canApprove: boolean;
  assets: { id: string; name: string; centreId: string }[];
  centres: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assetId, setAssetId] = useState("");
  const [centreId, setCentreId] = useState(centres[0]?.id ?? "");
  const [priority, setPriority] = useState("normal");
  const [creating, setCreating] = useState(false);

  async function patchRequest(id: string, body: Record<string, string>) {
    setLoadingId(id);
    await fetch(`/api/work-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoadingId(null);
    router.refresh();
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    await fetch("/api/work-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        assetId: assetId || undefined,
        centreId: centreId || undefined,
        priority,
      }),
    });
    setCreating(false);
    setTitle("");
    setDescription("");
    setAssetId("");
    router.refresh();
  }

  const open = requests.filter((r) => ["submitted", "approved", "in_progress"].includes(r.status));

  return (
    <div className="space-y-6">
      <Panel title="New work request">
        <form onSubmit={submitRequest} className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="text-[var(--workspace-muted)]">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2"
              placeholder="e.g. Treadmill belt slipping"
              required
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-[var(--workspace-muted)]">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2"
            />
          </label>
          {centres.length > 1 ? (
            <label className="text-sm">
              <span className="text-[var(--workspace-muted)]">Branch</span>
              <select
                value={centreId}
                onChange={(e) => setCentreId(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2"
              >
                {centres.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="text-sm">
            <span className="text-[var(--workspace-muted)]">Linked asset</span>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2"
            >
              <option value="">None</option>
              {assets
                .filter((a) => !centreId || a.centreId === centreId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-[var(--workspace-muted)]">Priority</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2"
            >
              <option value="low">Low (72h SLA)</option>
              <option value="normal">Normal (48h SLA)</option>
              <option value="high">High (24h SLA)</option>
              <option value="urgent">Urgent (4h SLA)</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={creating}>
              {creating ? "Submitting…" : "Submit request"}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title={`Open requests (${open.length})`}>
        {open.length === 0 ? (
          <p className="text-sm text-[var(--workspace-muted)]">No open work requests.</p>
        ) : (
          <div className="space-y-3">
            {open.map((req) => (
              <div
                key={req.id}
                className="rounded-lg border border-[var(--workspace-border)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{req.title}</span>
                      <Badge tone={PRIORITY_TONE[req.priority] ?? "neutral"}>{req.priority}</Badge>
                      <Badge tone={STATUS_TONE[req.status] ?? "neutral"}>
                        {req.status.replace("_", " ")}
                      </Badge>
                      {req.slaOverdue ? <Badge tone="danger">SLA overdue</Badge> : null}
                    </div>
                    {req.description ? (
                      <p className="mt-1 text-sm text-[var(--workspace-muted)]">{req.description}</p>
                    ) : null}
                    <div className="mt-2 text-xs text-[var(--workspace-muted)]">
                      {req.requesterName}
                      {req.assetName ? ` · ${req.assetName}` : ""} · SLA{" "}
                      {new Date(req.slaDueAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canApprove && req.status === "submitted" ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          disabled={loadingId === req.id}
                          onClick={() => patchRequest(req.id, { status: "approved" })}
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={loadingId === req.id}
                          onClick={() => patchRequest(req.id, { status: "rejected" })}
                        >
                          Reject
                        </Button>
                      </>
                    ) : null}
                    {req.status === "approved" ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={loadingId === req.id}
                        onClick={() => patchRequest(req.id, { status: "in_progress" })}
                      >
                        Start work
                      </Button>
                    ) : null}
                    {req.status === "in_progress" ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={loadingId === req.id}
                        onClick={() => patchRequest(req.id, { status: "completed" })}
                      >
                        Complete
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
