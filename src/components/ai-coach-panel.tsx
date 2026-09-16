"use client";

import { useState } from "react";
import {
  AiExplainer,
  type AiRecommendationResponse,
} from "@/components/intelligence/ai-explainer";
import { COACH_SCENARIOS, type CoachScenarioId } from "@/lib/product-sources";

type Client = { id: string; name: string; goal: string | null };

export function AiCoachPanel({ clients }: { clients: Client[] }) {
  const [memberId, setMemberId] = useState(clients[0]?.id ?? "");
  const [scenario, setScenario] = useState<CoachScenarioId>("first_session");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<AiRecommendationResponse | null>(null);

  async function generate() {
    if (!memberId) return;
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
    <div className="space-y-4">
      <p className="text-sm text-[var(--workspace-muted)]">
        Scenario-aware coaching prompts with explainability — signals, RAG sources, safety flags,
        and auditable accept / override / reject.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-[var(--workspace-muted)]">Client</label>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-[var(--workspace-muted)]">Scenario</label>
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value as CoachScenarioId)}
            className="w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
          >
            {COACH_SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={loading || !memberId}
        className="rounded-md bg-[var(--workspace-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? "Generating..." : "Get talk suggestions"}
      </button>

      {result && (
        <pre className="whitespace-pre-wrap rounded-md border border-[var(--workspace-border)] bg-[var(--workspace-elevated)] p-4 text-sm">
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
    </div>
  );
}
