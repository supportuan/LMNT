"use client";

import { useState } from "react";
import {
  AiExplainer,
  type AiRecommendationResponse,
} from "@/components/intelligence/ai-explainer";

type Client = { id: string; name: string; goal: string | null };

export function WorkoutPlannerPanel({ clients }: { clients: Client[] }) {
  const [memberId, setMemberId] = useState(clients[0]?.id ?? "");
  const [weeks, setWeeks] = useState(4);
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [experience, setExperience] = useState("beginner");
  const [injuries, setInjuries] = useState("");
  const [focus, setFocus] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<AiRecommendationResponse | null>(null);

  async function generate() {
    if (!memberId) return;
    setLoading(true);
    setPlan(null);
    setAiResponse(null);

    const response = await fetch("/api/ai/workout-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        weeks,
        daysPerWeek,
        experience,
        injuries: injuries || undefined,
        focus: focus || undefined,
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setPlan(data.error ?? "Request failed");
      return;
    }

    setPlan(data.plan);
    if (data.recommendationId && data.explanation) {
      setAiResponse({
        recommendationId: data.recommendationId,
        explanation: data.explanation,
        source: data.source,
      });
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--workspace-muted)]">
        AI programme design with explainability. Draft programmes are saved only after you accept
        (human-in-the-loop).
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm text-[var(--workspace-muted)]">Client</label>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="w-full rounded-lg border border-[var(--workspace-border)] px-3 py-2 text-sm"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-[var(--workspace-muted)]">Weeks</label>
          <input
            type="number"
            min={1}
            max={12}
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="w-full rounded-lg border border-[var(--workspace-border)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-[var(--workspace-muted)]">Days per week</label>
          <input
            type="number"
            min={1}
            max={6}
            value={daysPerWeek}
            onChange={(e) => setDaysPerWeek(Number(e.target.value))}
            className="w-full rounded-lg border border-[var(--workspace-border)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-[var(--workspace-muted)]">Experience</label>
          <select
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            className="w-full rounded-lg border border-[var(--workspace-border)] px-3 py-2 text-sm"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="return">Return to training</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-[var(--workspace-muted)]">Injuries / limits</label>
          <input
            value={injuries}
            onChange={(e) => setInjuries(e.target.value)}
            placeholder="e.g. previous knee pain"
            className="w-full rounded-lg border border-[var(--workspace-border)] px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-sm text-[var(--workspace-muted)]">Focus / goal</label>
          <input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="e.g. fat loss, strength"
            className="w-full rounded-lg border border-[var(--workspace-border)] px-3 py-2 text-sm"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={loading || !memberId}
        className="rounded-lg bg-[var(--workspace-accent)] px-4 py-2 text-sm font-semibold text-[var(--workspace-accent-text)] disabled:opacity-50"
      >
        {loading ? "Designing plan..." : "Design workout plan with AI"}
      </button>

      {plan && (
        <pre className="whitespace-pre-wrap rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-elevated)] p-4 text-sm">
          {plan}
        </pre>
      )}

      {aiResponse && plan && (
        <AiExplainer
          response={aiResponse}
          contentType="workout_plan"
          displayContent={plan}
        />
      )}
    </div>
  );
}
