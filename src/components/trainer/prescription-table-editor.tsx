"use client";

import type { ExerciseRow, SetPrescription } from "@/lib/coach-pro/engine";
import { formatPrescription } from "@/lib/coach-pro/engine";
import { Button } from "@/components/ui";

const PATTERN_WHY: Record<string, string> = {
  squat: "Lower-body force production",
  hinge: "Posterior chain strength",
  push: "Upper-body pressing",
  pull: "Upper-back balance",
  core: "Trunk stability",
  cardio: "Work capacity",
};

const inputCls =
  "w-full rounded border border-[var(--workspace-border)] bg-[var(--workspace-elevated)] px-2 py-1 text-xs tabular-nums";

export function PrescriptionTableEditor({
  dayLabel,
  exercises,
  onPrescriptionChange,
  onTargetRepsChange,
  onSetPlanChange,
  onSwap,
}: {
  dayLabel: string;
  exercises: ExerciseRow[];
  onPrescriptionChange: (exerciseId: string, prescription: string) => void;
  onTargetRepsChange: (exerciseId: string, targetReps: string) => void;
  onSetPlanChange: (exerciseId: string, setPlan: SetPrescription) => void;
  onSwap: (exerciseId: string) => void;
}) {
  function updateSet(ex: ExerciseRow, patch: Partial<SetPrescription>) {
    const base = ex.setPlan ?? { sets: 3, reps: ex.targetReps, weight: "", rest: "90s", rpe: "7–8" };
    const next = { ...base, ...patch };
    onSetPlanChange(ex.id, next);
    onPrescriptionChange(ex.id, formatPrescription(next));
    if (patch.reps) onTargetRepsChange(ex.id, patch.reps);
  }

  return (
    <div className="rounded-lg border border-[var(--workspace-border)] p-4">
      <h4 className="mb-3 font-medium">{dayLabel}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-[11px] uppercase tracking-wide text-[var(--workspace-muted)]">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 px-2">Exercise</th>
              <th className="py-2 px-2">Sets</th>
              <th className="py-2 px-2">Reps</th>
              <th className="py-2 px-2">Weight</th>
              <th className="py-2 px-2">Rest</th>
              <th className="py-2 px-2">RPE</th>
              <th className="py-2 pl-2" />
            </tr>
          </thead>
          <tbody>
            {exercises.map((ex, i) => {
              const plan = ex.setPlan ?? {
                sets: 3,
                reps: ex.targetReps,
                weight: "",
                rest: "90s",
                rpe: "7–8",
              };
              return (
                <tr key={ex.id} className="border-b border-[var(--workspace-border)]">
                  <td className="py-2 pr-2 text-[var(--workspace-muted)]">{i + 1}</td>
                  <td className="py-2 px-2">
                    <div className="font-medium">{ex.name}</div>
                    <div className="text-xs text-[var(--workspace-muted)]">
                      {ex.pattern} · {PATTERN_WHY[ex.pattern] ?? ""}
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min={1}
                      value={plan.sets}
                      onChange={(e) => updateSet(ex, { sets: Number(e.target.value) || 1 })}
                      className={`${inputCls} w-14`}
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      value={plan.reps}
                      onChange={(e) => updateSet(ex, { reps: e.target.value })}
                      className={`${inputCls} w-20`}
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      value={plan.weight}
                      placeholder="kg"
                      onChange={(e) => updateSet(ex, { weight: e.target.value })}
                      className={`${inputCls} w-20`}
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      value={plan.rest}
                      placeholder="90s"
                      onChange={(e) => updateSet(ex, { rest: e.target.value })}
                      className={`${inputCls} w-16`}
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      value={plan.rpe}
                      onChange={(e) => updateSet(ex, { rpe: e.target.value })}
                      className={`${inputCls} w-16`}
                    />
                  </td>
                  <td className="py-2 pl-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => onSwap(ex.id)}>
                      Swap
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
