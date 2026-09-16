"use client";

import { useState } from "react";
import {
  AiExplainer,
  type AiRecommendationResponse,
} from "@/components/intelligence/ai-explainer";
import { Button, Panel } from "@/components/ui";
import { COACH_SCENARIOS, type CoachScenarioId } from "@/lib/product-sources";

export function AiCoachCompact({
  memberId,
  memberName,
  defaultScenario = "floor",
}: {
  memberId: string;
  memberName: string;
  defaultScenario?: CoachScenarioId;
}) {
  const [scenario, setScenario] = useState<CoachScenarioId>(defaultScenario);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<AiRecommendationResponse | null>(null);

  async function generate() {
    setLoading(true);
    setResult(null);
    setAiResponse(null);
    const selected = COACH_SCENARIOS.find((s) => s.id === scenario);
    const response = await fetch("/api/ai/coach-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        topic: selected?.prompt,
        scenario,
      }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setResult(data.error ?? "Request failed");
      return;
    }
    if (Array.isArray(data.suggestions)) {
      setResult(data.suggestions.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n"));
    } else {
      setResult(data.suggestions);
    }
    if (data.recommendationId && data.explanation) {
      setAiResponse({
        recommendationId: data.recommendationId,
        explanation: data.explanation,
        source: data.source,
        note: data.note,
      });
    }
  }

  return (
    <Panel title="AI Coach assist" elevated>
      <p className="mb-3 text-sm text-[var(--workspace-muted)]">
        Explainable talk suggestions for {memberName} — review signals, then accept or override.
      </p>
      <div className="flex flex-wrap gap-2">
        <select
          value={scenario}
          onChange={(e) => setScenario(e.target.value as CoachScenarioId)}
          className="rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
        >
          {COACH_SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <Button type="button" size="sm" onClick={generate} disabled={loading}>
          {loading ? "Generating…" : "Get suggestions"}
        </Button>
      </div>
      {result && (
        <pre className="mt-3 whitespace-pre-wrap rounded-md border border-[var(--workspace-border)] bg-[var(--workspace-elevated)] p-3 text-sm">
          {result}
        </pre>
      )}
      {aiResponse && result && (
        <AiExplainer
          response={aiResponse}
          contentType="coach_suggestions"
          displayContent={result}
        />
      )}
    </Panel>
  );
}
