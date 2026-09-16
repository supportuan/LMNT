"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui";
import type { PipelineLead } from "@/modules/sales-queries";

const STAGES = [
  { id: "new", label: "New", tone: "info" as const },
  { id: "contacted", label: "Contacted", tone: "neutral" as const },
  { id: "consultation", label: "Consultation", tone: "warning" as const },
  { id: "trial", label: "Trial", tone: "info" as const },
  { id: "won", label: "Won", tone: "success" as const },
  { id: "lost", label: "Lost", tone: "danger" as const },
];

export function LeadKanban({ grouped }: { grouped: Record<string, PipelineLead[]> }) {
  const router = useRouter();
  const [dragging, setDragging] = useState<string | null>(null);

  async function moveLead(leadId: string, stage: string, convert = false) {
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(convert ? { id: leadId, convert: true } : { id: leadId, stage }),
    });
    router.refresh();
  }

  return (
    <div className="grid gap-4 overflow-x-auto lg:grid-cols-6">
      {STAGES.map((stage) => (
        <div
          key={stage.id}
          className="min-w-[200px] rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-elevated)] p-3"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragging) moveLead(dragging, stage.id);
            setDragging(null);
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide">{stage.label}</span>
            <Badge tone={stage.tone}>{grouped[stage.id]?.length ?? 0}</Badge>
          </div>
          <div className="space-y-2">
            {(grouped[stage.id] ?? []).map((lead) => (
              <div
                key={lead.id}
                draggable
                onDragStart={() => setDragging(lead.id)}
                className="cursor-grab rounded-md border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-3 text-sm active:cursor-grabbing"
              >
                <div className="font-semibold">{lead.name}</div>
                <div className="mt-1 text-xs text-[var(--workspace-muted)] line-clamp-2">
                  {lead.nextAction ?? lead.notes ?? lead.source}
                </div>
                {lead.nextAction ? (
                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--workspace-accent)]">
                    Next action
                  </div>
                ) : null}
                {lead.reportCount > 0 && (
                  <div className="mt-2 text-xs text-[var(--workspace-accent)]">
                    {lead.reportCount} consult report{lead.reportCount > 1 ? "s" : ""}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    href={`/app/leads/consultation?lead=${lead.id}`}
                    className="text-xs font-semibold text-[var(--workspace-accent)]"
                  >
                    Consult
                  </Link>
                  {stage.id !== "won" && stage.id !== "lost" && (
                    <button
                      type="button"
                      className="text-xs text-[var(--workspace-muted)]"
                      onClick={() =>
                        moveLead(
                          lead.id,
                          stage.id === "trial" ? "won" : "trial",
                          stage.id === "trial",
                        )
                      }
                    >
                      Advance
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
