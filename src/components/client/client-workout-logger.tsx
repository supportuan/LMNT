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

export function ClientWorkoutLogger({
  workoutLabel,
  exercises,
}: {
  workoutLabel: string;
  exercises: Exercise[];
}) {
  const router = useRouter();
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

  return (
    <div className="mt-6 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-elevated)] p-4">
      <h4 className="font-medium">Log {workoutLabel}</h4>
      <p className="mt-1 text-sm text-[var(--workspace-muted)]">
        Record load and reps for each exercise — your coach reviews these in session logs.
      </p>

      {done ? (
        <p className="mt-3 text-sm text-[var(--status-success)]">Workout logged. Great work!</p>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[var(--workspace-muted)]">
                  <th className="py-2 pr-2">Exercise</th>
                  <th className="py-2 px-2">Target</th>
                  <th className="py-2 px-2">Load</th>
                  <th className="py-2 px-2">Reps</th>
                  <th className="py-2 pl-2">RPE</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.exerciseName} className="border-b">
                    <td className="py-2 pr-2 font-medium">{log.exerciseName}</td>
                    <td className="py-2 px-2 text-[var(--workspace-muted)]">{log.targetPrescription}</td>
                    <td className="py-2 px-2">
                      <input
                        value={log.load}
                        onChange={(e) => updateLog(i, "load", e.target.value)}
                        placeholder="kg"
                        className="w-16 rounded border px-2 py-1"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        value={log.reps}
                        onChange={(e) => updateLog(i, "reps", e.target.value)}
                        placeholder="8"
                        className="w-14 rounded border px-2 py-1"
                      />
                    </td>
                    <td className="py-2 pl-2">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={log.rpe ?? ""}
                        onChange={(e) =>
                          updateLog(i, "rpe", e.target.value ? Number(e.target.value) : null)
                        }
                        className="w-14 rounded border px-2 py-1"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="text-[var(--workspace-muted)]">Session RPE</span>
              <input
                type="number"
                min={1}
                max={10}
                value={sessionRpe}
                onChange={(e) => setSessionRpe(Number(e.target.value))}
                className="ml-2 w-16 rounded-md border px-2 py-1"
              />
            </label>
            <Button type="button" onClick={complete} disabled={loading}>
              {loading ? "Saving…" : "Complete workout"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
