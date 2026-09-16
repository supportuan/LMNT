"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function ClientWorkoutComplete({
  workoutLabel,
  hasExercises,
}: {
  workoutLabel: string;
  hasExercises: boolean;
}) {
  const router = useRouter();
  const [rpe, setRpe] = useState(7);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function complete() {
    setLoading(true);
    const res = await fetch("/api/client/workout-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rpe }),
    });
    setLoading(false);
    if (res.ok) {
      setDone(true);
      router.refresh();
    }
  }

  if (!hasExercises) return null;

  return (
    <div className="mt-6 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-elevated)] p-4">
      <h4 className="font-medium">Log workout complete</h4>
      <p className="mt-1 text-sm text-[var(--workspace-muted)]">
        Mark {workoutLabel} as done — your coach will see this in progress.
      </p>
      {done ? (
        <p className="mt-3 text-sm text-[var(--status-success)]">Workout logged. Great work!</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="text-[var(--workspace-muted)]">Session RPE</span>
            <input
              type="number"
              min={1}
              max={10}
              value={rpe}
              onChange={(e) => setRpe(Number(e.target.value))}
              className="ml-2 w-16 rounded-md border px-2 py-1"
            />
          </label>
          <Button type="button" onClick={complete} disabled={loading}>
            {loading ? "Saving…" : "Complete workout"}
          </Button>
        </div>
      )}
    </div>
  );
}
