"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import { MOVEMENT_PATTERNS, computeReadinessScore, readinessLabel } from "@/lib/coach-pro/readiness";

type Assessment = {
  id: string;
  status: string;
  parqCleared: boolean;
  referralRequired: boolean;
  scores: Record<string, number> | null;
  notes: string | null;
};

export function AssessmentForm({
  memberId,
  initial,
}: {
  memberId: string;
  initial: Assessment | null;
}) {
  const router = useRouter();
  const [parqCleared, setParqCleared] = useState(initial?.parqCleared ?? false);
  const [referralRequired, setReferralRequired] = useState(initial?.referralRequired ?? false);
  const [doctorClearance, setDoctorClearance] = useState(false);
  const [symptoms, setSymptoms] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>(
    initial?.scores ?? Object.fromEntries(MOVEMENT_PATTERNS.map((p) => [p, 3])),
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [loading, setLoading] = useState(false);

  const readiness = computeReadinessScore(scores, parqCleared && doctorClearance && !symptoms);
  const readinessInfo = readinessLabel(readiness);

  async function save(status: "in_progress" | "completed" | "referred") {
    setLoading(true);
    const payload = {
      memberId,
      parqCleared: parqCleared && doctorClearance && !symptoms,
      referralRequired: referralRequired || symptoms || !doctorClearance,
      scores: { ...scores, readiness },
      notes,
      status,
    };

    const res = initial
      ? await fetch("/api/assessments", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: initial.id, ...payload }),
        })
      : await fetch("/api/assessments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    setLoading(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[var(--workspace-border)] p-4">
        <h3 className="font-semibold">Health gate</h3>
        <p className="mt-1 text-sm text-[var(--workspace-muted)]">
          PAR-Q clearance and symptom check before programming.
        </p>
        <div className="mt-3 space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={parqCleared} onChange={(e) => setParqCleared(e.target.checked)} />
            PAR-Q completed — no contraindications reported
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={doctorClearance} onChange={(e) => setDoctorClearance(e.target.checked)} />
            Medical clearance obtained where required
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={symptoms} onChange={(e) => setSymptoms(e.target.checked)} />
            Client reports symptoms during exertion (chest pain, dizziness, etc.)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={referralRequired}
              onChange={(e) => setReferralRequired(e.target.checked)}
            />
            Refer for medical assessment before training
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--workspace-border)] p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Movement screen</h3>
          <Badge tone={readinessInfo.tone}>
            {readiness} — {readinessInfo.label}
          </Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {MOVEMENT_PATTERNS.map((pattern) => (
            <label key={pattern} className="text-sm">
              <span className="capitalize text-[var(--workspace-muted)]">{pattern}</span>
              <input
                type="range"
                min={1}
                max={5}
                value={scores[pattern] ?? 3}
                onChange={(e) => setScores((s) => ({ ...s, [pattern]: Number(e.target.value) }))}
                className="mt-1 w-full"
              />
              <span className="text-xs">{scores[pattern] ?? 3}/5</span>
            </label>
          ))}
        </div>
      </div>

      <label className="block text-sm">
        <span className="text-[var(--workspace-muted)]">Trainer notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2"
          placeholder="Coaching considerations, regressions, referral notes…"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={loading} onClick={() => save("in_progress")}>
          Save draft
        </Button>
        <Button
          type="button"
          disabled={loading || symptoms || !doctorClearance}
          onClick={() => save(referralRequired ? "referred" : "completed")}
        >
          {loading ? "Saving…" : "Complete assessment"}
        </Button>
      </div>
    </div>
  );
}
