"use client";

import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import type { AiExplanation } from "@/lib/intelligence/explain";

export type AiRecommendationResponse = {
  recommendationId: string;
  explanation: AiExplanation;
  source?: string;
  note?: string;
};

export function AiExplainer({
  response,
  contentType,
  displayContent,
  onResolved,
}: {
  response: AiRecommendationResponse;
  contentType: "coach_suggestions" | "workout_plan";
  displayContent: string;
  onResolved?: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [overrideText, setOverrideText] = useState(displayContent);
  const [resolved, setResolved] = useState<"accepted" | "rejected" | null>(null);
  const [overridden, setOverridden] = useState(false);

  async function resolve(
    nextStatus: "accepted" | "overridden" | "rejected",
    payload: Record<string, unknown> = {},
  ) {
    setLoading(nextStatus);
    const res = await fetch(`/api/ai/recommendations/${response.recommendationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, ...payload }),
    });
    setLoading(null);
    if (res.ok) {
      if (nextStatus === "overridden") setOverridden(true);
      else setResolved(nextStatus);
      onResolved?.();
    }
  }

  const { explanation } = response;

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-elevated)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--workspace-muted)]">
          Why this recommendation
        </span>
        {response.source && <Badge tone="info">{response.source}</Badge>}
        {overridden && !resolved && <Badge tone="info">overridden</Badge>}
        {resolved && <Badge tone="success">{resolved}</Badge>}
      </div>

      {response.note && <p className="text-xs text-[var(--workspace-muted)]">{response.note}</p>}

      {explanation.safetyFlags.length > 0 && (
        <div className="rounded-lg border border-[var(--status-warning)]/40 bg-[var(--status-warning-bg)] p-2">
          <div className="mb-1 text-xs font-semibold text-[var(--status-warning)]">Safety flags</div>
          <ul className="list-disc space-y-1 pl-4 text-xs text-[var(--workspace-text)]">
            {explanation.safetyFlags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      <ul className="list-disc space-y-1 pl-4 text-xs text-[var(--workspace-muted)]">
        {explanation.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>

      <div className="grid gap-2 sm:grid-cols-2">
        {explanation.signals.map((signal) => (
          <div key={signal.label} className="rounded-lg border border-[var(--workspace-border)] px-2 py-1.5">
            <div className="text-[10px] uppercase text-[var(--workspace-muted)]">{signal.label}</div>
            <div className="text-xs font-medium">{signal.value}</div>
          </div>
        ))}
      </div>

      {explanation.sources.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase text-[var(--workspace-muted)]">
            Knowledge sources
          </div>
          <div className="flex flex-wrap gap-1">
            {explanation.sources.map((source) => (
              <Badge key={source.id} tone="neutral">
                {source.source}
                {source.score > 0 ? ` · ${source.score}` : ""}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {!resolved && (
        <div className="flex flex-wrap gap-2 border-t border-[var(--workspace-border)] pt-3">
          <Button
            type="button"
            size="sm"
            disabled={loading != null}
            onClick={() => resolve("accepted")}
          >
            {loading === "accepted" ? "Saving…" : "Accept"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={loading != null}
            onClick={() => setEditing((v) => !v)}
          >
            Override
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={loading != null}
            onClick={() => resolve("rejected")}
          >
            {loading === "rejected" ? "…" : "Reject"}
          </Button>
        </div>
      )}

      {editing && !resolved && (
        <div className="space-y-2">
          <textarea
            className="min-h-[120px] w-full rounded-xl border border-[var(--workspace-border)] px-3 py-2 text-sm"
            value={overrideText}
            onChange={(e) => setOverrideText(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            disabled={loading != null || !overrideText.trim()}
            onClick={() =>
              resolve(
                "overridden",
                contentType === "coach_suggestions"
                  ? {
                      overrideSuggestions: overrideText
                        .split("\n")
                        .map((l) => l.replace(/^\d+[\).\s-]+/, "").trim())
                        .filter(Boolean),
                    }
                  : { overridePlan: overrideText },
              )
            }
          >
            {loading === "overridden" ? "Saving override…" : "Save override"}
          </Button>
        </div>
      )}

      {resolved === "accepted" && contentType === "workout_plan" && (
        <p className="text-xs text-[var(--status-success)]">
          Draft programme saved — review in Workouts before publishing.
        </p>
      )}
    </div>
  );
}
