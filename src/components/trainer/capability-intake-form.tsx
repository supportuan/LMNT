"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import {
  type CapabilityIntake,
  type CapabilityProfile,
  DEFAULT_CAPABILITY_INTAKE,
  computeCapability,
} from "@/lib/capability-score";
import { MOVEMENT_PATTERNS } from "@/lib/coach-pro/readiness";

const inputClass = "w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm";

export function CapabilityIntakeForm({
  memberId,
  assessmentId,
  initialIntake,
  initialProfile,
  initialScore,
}: {
  memberId: string;
  assessmentId?: string;
  initialIntake?: CapabilityIntake | null;
  initialProfile?: CapabilityProfile | null;
  initialScore?: number | null;
}) {
  const router = useRouter();
  const [intake, setIntake] = useState<CapabilityIntake>(initialIntake ?? DEFAULT_CAPABILITY_INTAKE);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [profile, setProfile] = useState<CapabilityProfile | null>(initialProfile ?? null);
  const [score, setScore] = useState<number | null>(initialScore ?? null);

  const preview = computeCapability(intake);

  async function submit(complete: boolean) {
    setLoading(true);
    setOutput("");
    const res = await fetch("/api/capability-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, assessmentId, intake, complete }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setOutput(data.error ?? "Output: No");
      return;
    }
    setScore(data.capabilityScore);
    setProfile(data.profile);
    setOutput(data.output ?? "Output: Capability score generated");
    router.refresh();
  }

  function setMovement(pattern: string, value: number) {
    setIntake((prev) => ({
      ...prev,
      fitness: {
        ...prev.fitness,
        movementScores: { ...prev.fitness.movementScores, [pattern]: value },
      },
    }));
  }

  return (
    <div className="space-y-6">
      <Panel title="PAR-Q">
        <div className="space-y-2 text-sm">
          {(Object.keys(intake.parq) as (keyof typeof intake.parq)[]).map((key) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={intake.parq[key]}
                onChange={(e) =>
                  setIntake((prev) => ({ ...prev, parq: { ...prev.parq, [key]: e.target.checked } }))
                }
              />
              {parqLabel(key)}
            </label>
          ))}
        </div>
      </Panel>

      <Panel title="Lifestyle questionnaire">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Daily activity"
            value={intake.lifestyle.activityLevel}
            onChange={(v) =>
              setIntake((prev) => ({
                ...prev,
                lifestyle: { ...prev.lifestyle, activityLevel: v as CapabilityIntake["lifestyle"]["activityLevel"] },
              }))
            }
            options={["low", "moderate", "high"]}
          />
          <SelectField
            label="Stress"
            value={intake.lifestyle.stress}
            onChange={(v) =>
              setIntake((prev) => ({
                ...prev,
                lifestyle: { ...prev.lifestyle, stress: v as CapabilityIntake["lifestyle"]["stress"] },
              }))
            }
            options={["low", "moderate", "high"]}
          />
          <SelectField
            label="Nutrition"
            value={intake.lifestyle.nutrition}
            onChange={(v) =>
              setIntake((prev) => ({
                ...prev,
                lifestyle: { ...prev.lifestyle, nutrition: v as CapabilityIntake["lifestyle"]["nutrition"] },
              }))
            }
            options={["poor", "fair", "good"]}
          />
          <label className="block text-sm font-medium">
            Sleep (hours/night)
            <input
              type="number"
              min={0}
              max={14}
              step={0.5}
              value={intake.lifestyle.sleepHours}
              onChange={(e) =>
                setIntake((prev) => ({
                  ...prev,
                  lifestyle: { ...prev.lifestyle, sleepHours: Number(e.target.value) },
                }))
              }
              className={`${inputClass} mt-1`}
            />
          </label>
        </div>
      </Panel>

      <Panel title="Medical history">
        <div className="space-y-3">
          <TextField
            label="Conditions"
            value={intake.medical.conditions}
            onChange={(v) => setIntake((prev) => ({ ...prev, medical: { ...prev.medical, conditions: v } }))}
          />
          <TextField
            label="Medications"
            value={intake.medical.medications}
            onChange={(v) => setIntake((prev) => ({ ...prev, medical: { ...prev.medical, medications: v } }))}
          />
          <TextField
            label="Injuries"
            value={intake.medical.injuries}
            onChange={(v) => setIntake((prev) => ({ ...prev, medical: { ...prev.medical, injuries: v } }))}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={intake.medical.clearanceObtained}
              onChange={(e) =>
                setIntake((prev) => ({
                  ...prev,
                  medical: { ...prev.medical, clearanceObtained: e.target.checked },
                }))
              }
            />
            Medical clearance obtained where needed
          </label>
        </div>
      </Panel>

      <Panel title="Fitness assessment">
        <label className="mb-3 block text-sm font-medium">
          Training age (months)
          <input
            type="number"
            min={0}
            value={intake.fitness.trainingAgeMonths}
            onChange={(e) =>
              setIntake((prev) => ({
                ...prev,
                fitness: { ...prev.fitness, trainingAgeMonths: Number(e.target.value) },
              }))
            }
            className={`${inputClass} mt-1`}
          />
        </label>
        <div className="space-y-3">
          {MOVEMENT_PATTERNS.map((pattern) => (
            <label key={pattern} className="block text-sm">
              <span className="capitalize">{pattern}</span>
              <input
                type="range"
                min={0}
                max={5}
                value={intake.fitness.movementScores[pattern] ?? 3}
                onChange={(e) => setMovement(pattern, Number(e.target.value))}
                className="ml-2 w-full"
              />
            </label>
          ))}
        </div>
      </Panel>

      <div className="rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">Preview capability</span>
          <Badge tone={preview.profile.bucket === "refer" ? "danger" : "success"}>{preview.score}</Badge>
          <Badge tone="neutral">{preview.profile.bucket}</Badge>
          <span className="text-sm text-[var(--workspace-muted)]">{preview.profile.daysPerWeek} days/week suggested</span>
        </div>
        <p className="mt-2 text-sm">{preview.profile.rationale}</p>
      </div>

      {(profile || score != null) && (
        <div className="rounded-lg border border-[var(--emerald-neon)]/40 bg-[var(--emerald-neon-tint)] p-4">
          <p className="font-semibold text-[var(--status-success)]">
            Output: Capability score {score ?? preview.score}
          </p>
          {profile && (
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                <strong>Immediate:</strong> {profile.immediateGoal}
              </li>
              <li>
                <strong>Long term:</strong> {profile.longTermGoal}
              </li>
            </ul>
          )}
        </div>
      )}

      {output && !output.includes("Capability") && <p className="text-sm text-red-600">{output}</p>}

      <div className="flex gap-2">
        <Button type="button" disabled={loading} onClick={() => void submit(false)}>
          {loading ? "Saving…" : "Save draft"}
        </Button>
        <Button type="button" variant="secondary" disabled={loading} onClick={() => void submit(true)}>
          Generate capability score
        </Button>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--workspace-border)] p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} mt-1`}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} mt-1`} />
    </label>
  );
}

function parqLabel(key: keyof CapabilityIntake["parq"]) {
  const map: Record<keyof CapabilityIntake["parq"], string> = {
    chestPain: "Chest pain when exercising",
    boneJoint: "Bone or joint problem",
    bloodPressure: "High blood pressure",
    dizziness: "Dizziness or loss of consciousness",
    otherRisk: "Other physician-advised exercise restriction",
  };
  return map[key];
}