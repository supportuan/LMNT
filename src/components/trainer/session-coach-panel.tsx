"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

type WorkoutOption = {
  key: string;
  label: string;
  exercises: {
    exerciseName: string;
    movementPattern?: string;
    targetPrescription?: string;
    sets?: string;
    reps?: string;
    weight?: string;
  }[];
};

type Row = {
  exerciseName: string;
  movementPattern?: string;
  targetPrescription?: string;
  sets: string;
  load: string;
  reps: string;
  rpe: string;
  notes: string;
  completed: boolean;
  sortOrder: number;
};

function parseSetsReps(prescription?: string, fallbackReps?: string) {
  const text = prescription ?? "";
  const match = text.match(/(\d+)\s*[×x]\s*([0-9–\-]+)/);
  return {
    sets: match?.[1] ?? "3",
    reps: match?.[2] ?? fallbackReps ?? "",
  };
}

export function SessionCoachPanel({
  sessionId,
  memberId,
  memberName,
  initialStatus,
  initialRpe,
  initialPain,
  feedbackNotes,
  initialEnergy,
  exercises,
  savedLogs,
  workoutOptions,
}: {
  sessionId: string;
  memberId: string;
  memberName: string;
  initialStatus: string;
  initialRpe: number | null;
  initialPain: boolean;
  feedbackNotes: string;
  initialEnergy?: string;
  exercises: {
    exerciseName: string;
    movementPattern?: string;
    targetPrescription?: string;
  }[];
  savedLogs: {
    exerciseName: string;
    load: string | null;
    reps: string | null;
    rpe: number | null;
    notes?: string | null;
    status?: string | null;
  }[];
  workoutOptions: WorkoutOption[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [workoutKey, setWorkoutKey] = useState(workoutOptions[0]?.key ?? "default");
  const [rows, setRows] = useState<Row[]>([]);
  const [rpe, setRpe] = useState(initialRpe ?? "");
  const [pain, setPain] = useState(initialPain ? "Yes" : "No");
  const [energy, setEnergy] = useState(initialEnergy ?? "");
  const [notes, setNotes] = useState(feedbackNotes);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  useEffect(() => {
    const selected = workoutOptions.find((w) => w.key === workoutKey);
    const source = selected?.exercises?.length ? selected.exercises : exercises;
    setRows(
      source.map((ex, i) => {
        const log = savedLogs.find((l) => l.exerciseName === ex.exerciseName);
        const parsed = parseSetsReps(ex.targetPrescription, log?.reps ?? undefined);
        return {
          exerciseName: ex.exerciseName,
          movementPattern: ex.movementPattern,
          targetPrescription: ex.targetPrescription,
          sets: parsed.sets,
          load: log?.load ?? "",
          reps: log?.reps ?? parsed.reps,
          rpe: log?.rpe?.toString() ?? "",
          notes: log?.notes ?? "",
          completed: log ? log.status !== "skipped" : false,
          sortOrder: i,
        };
      }),
    );
  }, [exercises, savedLogs, workoutKey, workoutOptions]);

  const inputCls =
    "w-full rounded-md border border-[var(--workspace-border)] bg-[var(--workspace-elevated)] px-2 py-2 text-sm";

  async function startSession() {
    setLoading(true);
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    });
    setStatus("in_progress");
    setLoading(false);
  }

  async function saveExercises() {
    await fetch(`/api/sessions/${sessionId}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exercises: rows.map((r, i) => ({
          exerciseName: r.exerciseName,
          movementPattern: r.movementPattern,
          targetPrescription: r.targetPrescription,
          load: r.load || undefined,
          reps: r.reps || undefined,
          rpe: r.rpe ? Number(r.rpe) : null,
          notes: [r.sets ? `Sets ${r.sets}` : "", r.notes].filter(Boolean).join(" · ") || undefined,
          status: r.completed ? "completed" : "skipped",
          sortOrder: i,
        })),
      }),
    });
  }

  async function finishSession() {
    setCloseError(null);
    setLoading(true);
    await saveExercises();
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "completed",
        rpe: rpe ? Number(rpe) : null,
        painFlag: pain === "Yes",
        notes,
        energy,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setStatus("completed");
      setSaved(true);
      router.refresh();
      return;
    }
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    setCloseError(body?.error ?? "Could not close session. Check required fields.");
  }

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
      <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--workspace-muted)]">
              Training session
            </div>
            <h2 className="text-lg font-semibold">{memberName}</h2>
          </div>
          {workoutOptions.length > 0 && (
            <label className="text-sm">
              <span className="mb-1 block text-[var(--workspace-muted)]">Select workout</span>
              <select
                value={workoutKey}
                onChange={(e) => setWorkoutKey(e.target.value)}
                className={`${inputCls} min-w-[220px]`}
              >
                {workoutOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="space-y-3">
          {rows.map((ex, i) => (
            <div
              key={`${ex.exerciseName}-${i}`}
              className={`rounded-lg border p-4 ${
                ex.completed
                  ? "border-[var(--workspace-accent)] bg-[var(--workspace-accent-muted)]"
                  : "border-[var(--workspace-border)]"
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{ex.exerciseName}</div>
                  <div className="text-xs text-[var(--workspace-muted)]">{ex.targetPrescription}</div>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={ex.completed}
                    onChange={(e) => updateRow(i, { completed: e.target.checked })}
                    className="h-4 w-4"
                  />
                  Complete
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="text-[10px] uppercase tracking-wide text-[var(--workspace-muted)]">
                  Sets
                  <input
                    value={ex.sets}
                    onChange={(e) => updateRow(i, { sets: e.target.value })}
                    className={`${inputCls} mt-1 font-mono`}
                  />
                </label>
                <label className="text-[10px] uppercase tracking-wide text-[var(--workspace-muted)]">
                  Reps
                  <input
                    value={ex.reps}
                    onChange={(e) => updateRow(i, { reps: e.target.value })}
                    className={`${inputCls} mt-1 font-mono`}
                  />
                </label>
                <label className="text-[10px] uppercase tracking-wide text-[var(--workspace-muted)]">
                  Weight
                  <input
                    value={ex.load}
                    onChange={(e) => updateRow(i, { load: e.target.value })}
                    placeholder="kg"
                    className={`${inputCls} mt-1 font-mono`}
                  />
                </label>
              </div>
              <input
                value={ex.notes}
                onChange={(e) => updateRow(i, { notes: e.target.value })}
                placeholder="Exercise note"
                className={`${inputCls} mt-2`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {status === "scheduled" && (
          <Button type="button" onClick={startSession} className="w-full min-h-12" disabled={loading}>
            {loading ? "Starting…" : "Start Session"}
          </Button>
        )}

        <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-5">
          <h2 className="mb-1 font-semibold">Trainer notes</h2>
          <p className="mb-4 text-xs text-[var(--workspace-muted)]">
            Required to finish: session notes, RPE (1–10), and energy level.
            {pain === "Yes" ? " Pain flagged — notes must be at least 10 characters." : ""}
          </p>
          <div className="space-y-3 text-sm">
            <label>
              <span className="text-[var(--workspace-muted)]">
                Session notes <span className="text-[var(--workspace-accent)]">*</span>
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="How did the session go? What to change next time?"
                className={`${inputCls} mt-1`}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="text-[var(--workspace-muted)]">
                  Session RPE <span className="text-[var(--workspace-accent)]">*</span>
                </span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={rpe}
                  onChange={(e) => setRpe(e.target.value)}
                  className={`${inputCls} mt-1`}
                />
              </label>
              <label>
                <span className="text-[var(--workspace-muted)]">
                  Energy <span className="text-[var(--workspace-accent)]">*</span>
                </span>
                <select value={energy} onChange={(e) => setEnergy(e.target.value)} className={`${inputCls} mt-1`}>
                  <option value="">—</option>
                  <option>Low</option>
                  <option>Okay</option>
                  <option>Good</option>
                  <option>Excellent</option>
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-[var(--workspace-muted)]">Pain / discomfort</span>
              <select value={pain} onChange={(e) => setPain(e.target.value)} className={`${inputCls} mt-1`}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </label>
          </div>

          {closeError ? (
            <div className="mt-4 rounded-md bg-[var(--status-danger-bg)] p-3 text-sm text-[var(--status-danger)]">
              {closeError}
            </div>
          ) : null}

          {status !== "completed" && (
            <Button
              type="button"
              onClick={status === "scheduled" ? startSession : finishSession}
              disabled={loading}
              className="mt-4 min-h-12 w-full"
            >
              {loading
                ? "Saving…"
                : status === "scheduled"
                  ? "Start Session"
                  : "Finish Session"}
            </Button>
          )}
          {status !== "scheduled" && status !== "completed" && (
            <p className="mt-2 text-center text-xs text-[var(--workspace-muted)]">
              Saves sets, reps, weight, and notes to client progress.
            </p>
          )}

          {saved && (
            <div className="mt-4 rounded-md bg-[var(--status-success-bg)] p-3 text-sm text-[var(--status-success)]">
              Session saved. Progress updated.
            </div>
          )}
        </div>

        <Button href={`/app/clients/${memberId}/progress`} variant="secondary" className="w-full">
          View progress
        </Button>
      </div>
    </div>
  );
}
