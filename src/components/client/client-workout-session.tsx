"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

type Exercise = {
  id: string;
  name: string;
  pattern: string;
  prescription: string;
};

type ExerciseLog = {
  exerciseName: string;
  movementPattern: string;
  targetPrescription: string;
  load: string;
  reps: string;
  rpe: number | null;
};

const PATTERN_CLASS: Record<string, string> = {
  squat: "kinetic-strength",
  hinge: "kinetic-strength",
  push: "kinetic-strength",
  pull: "kinetic-strength",
  core: "kinetic-hiit",
  cardio: "kinetic-cardio",
};

const inputCls =
  "w-full rounded-lg border border-[var(--workspace-border)] bg-[#2a2a2a] px-4 py-3 text-center font-mono text-xl font-bold text-[var(--workspace-text)] outline-none focus:border-[var(--workspace-accent)]";

export function ClientWorkoutSession({
  workoutLabel,
  weekLabel,
  exercises,
}: {
  workoutLabel: string;
  weekLabel?: string;
  exercises: Exercise[];
}) {
  const router = useRouter();
  const [activeIdx, setActiveIdx] = useState(0);
  const [logs, setLogs] = useState<ExerciseLog[]>(
    exercises.map((ex) => ({
      exerciseName: ex.name,
      movementPattern: ex.pattern,
      targetPrescription: ex.prescription,
      load: "",
      reps: "",
      rpe: null,
    })),
  );
  const [sessionRpe, setSessionRpe] = useState(7);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const active = exercises[activeIdx];
  const activeLog = logs[activeIdx];

  function updateLog(index: number, field: keyof ExerciseLog, value: string | number | null) {
    setLogs((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  async function complete() {
    setLoading(true);
    const res = await fetch("/api/client/workout-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rpe: sessionRpe,
        exercises: logs.map((l, i) => ({
          exerciseName: l.exerciseName,
          movementPattern: l.movementPattern,
          targetPrescription: l.targetPrescription,
          load: l.load || undefined,
          reps: l.reps || undefined,
          rpe: l.rpe,
          sortOrder: i,
        })),
      }),
    });
    setLoading(false);
    if (res.ok) {
      setDone(true);
      router.refresh();
    }
  }

  if (exercises.length === 0) return null;

  if (done) {
    return (
      <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-8 text-center">
        <div className="font-mono text-4xl font-bold text-[var(--workspace-accent)]">✓</div>
        <h3 className="mt-3 text-lg font-semibold">Workout complete</h3>
        <p className="mt-1 text-sm text-[var(--workspace-muted)]">
          {workoutLabel} logged — your coach can review session data.
        </p>
      </div>
    );
  }

  return (
    <div className="-mx-2 sm:mx-0">
      <div className="mb-4 flex items-center justify-between px-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--workspace-muted)]">
            {weekLabel ?? "Today"}
          </div>
          <h3 className="text-lg font-bold">{workoutLabel}</h3>
        </div>
        <div className="font-mono text-sm tabular-nums text-[var(--workspace-accent)]">
          {activeIdx + 1}/{exercises.length}
        </div>
      </div>

      <div className="mb-3 flex gap-1 px-2">
        {exercises.map((ex, i) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => setActiveIdx(i)}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i === activeIdx
                ? "bg-[var(--workspace-accent)]"
                : logs[i]?.load || logs[i]?.reps
                  ? "bg-[var(--status-success)]"
                  : "bg-[var(--workspace-elevated)]"
            }`}
            aria-label={`Exercise ${i + 1}: ${ex.name}`}
          />
        ))}
      </div>

      {active && activeLog && (
        <div
          className={`mx-2 rounded-xl border border-[var(--workspace-border)] p-5 ${PATTERN_CLASS[active.pattern] ?? "kinetic-muted"}`}
        >
          <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--workspace-muted)]">
            {active.pattern}
          </div>
          <h4 className="mt-1 text-xl font-bold">{active.name}</h4>
          <p className="mt-2 font-mono text-sm text-[var(--workspace-muted)]">{active.prescription}</p>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-2 block font-mono text-[10px] uppercase tracking-wide text-[var(--workspace-muted)]">
                Load (kg)
              </span>
              <input
                inputMode="decimal"
                value={activeLog.load}
                onChange={(e) => updateLog(activeIdx, "load", e.target.value)}
                placeholder="—"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-2 block font-mono text-[10px] uppercase tracking-wide text-[var(--workspace-muted)]">
                Reps
              </span>
              <input
                inputMode="numeric"
                value={activeLog.reps}
                onChange={(e) => updateLog(activeIdx, "reps", e.target.value)}
                placeholder="—"
                className={inputCls}
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block font-mono text-[10px] uppercase tracking-wide text-[var(--workspace-muted)]">
              Exercise RPE
            </span>
            <input
              type="number"
              min={1}
              max={10}
              value={activeLog.rpe ?? ""}
              onChange={(e) =>
                updateLog(activeIdx, "rpe", e.target.value ? Number(e.target.value) : null)
              }
              placeholder="7"
              className={`${inputCls} max-w-[120px]`}
            />
          </label>
        </div>
      )}

      <div className="sticky bottom-0 mt-6 border-t border-[var(--workspace-border)] bg-[var(--workspace-bg)] px-2 py-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            disabled={activeIdx === 0}
            onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
            className="min-h-12 rounded-lg border border-[var(--workspace-border)] px-4 py-2 text-sm font-semibold disabled:opacity-30"
          >
            ← Prev
          </button>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-[var(--workspace-muted)]">Session RPE</span>
            <input
              type="number"
              min={1}
              max={10}
              value={sessionRpe}
              onChange={(e) => setSessionRpe(Number(e.target.value))}
              className="w-14 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-elevated)] px-2 py-2 text-center font-mono font-bold"
            />
          </label>
          {activeIdx < exercises.length - 1 ? (
            <button
              type="button"
              onClick={() => setActiveIdx((i) => i + 1)}
              className="min-h-12 rounded-lg bg-[var(--workspace-accent)] px-4 py-2 text-sm font-bold text-[var(--workspace-accent-text,#161e00)]"
            >
              Next →
            </button>
          ) : (
            <Button type="button" onClick={complete} disabled={loading} className="min-h-12 px-6">
              {loading ? "Saving…" : "Finish"}
            </Button>
          )}
        </div>
        {activeIdx === exercises.length - 1 && (
          <Button type="button" onClick={complete} disabled={loading} className="min-h-12 w-full">
            {loading ? "Saving workout…" : "Complete workout"}
          </Button>
        )}
      </div>
    </div>
  );
}
