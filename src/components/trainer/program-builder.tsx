"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PrescriptionTableEditor } from "@/components/trainer/prescription-table-editor";
import { WorkoutPlannerPanel } from "@/components/workout-planner-panel";
import { Badge, Button } from "@/components/ui";
import {
  VISUAL_PROFILES,
  buildFourWeekPlan,
  silhouette,
  swapExerciseInPattern,
  type SetPrescription,
  type WeekPlan,
} from "@/lib/coach-pro/engine";

export function ProgramBuilder({
  memberId,
  memberName,
  programmeId,
  status,
  initialContent,
  assessment,
}: {
  memberId: string;
  memberName: string;
  programmeId?: string;
  status?: string;
  initialContent?: { weeks?: WeekPlan[]; goal?: string; daysPerWeek?: number; visualProfile?: string };
  assessment?: {
    status: string;
    parqCleared: boolean;
    referralRequired: boolean;
  } | null;
}) {
  const router = useRouter();
  const [goal, setGoal] = useState(initialContent?.goal ?? "muscle");
  const [daysPerWeek, setDaysPerWeek] = useState(initialContent?.daysPerWeek ?? 4);
  const [visualId, setVisualId] = useState(initialContent?.visualProfile ?? "i1");
  const [weeks, setWeeks] = useState<WeekPlan[]>(initialContent?.weeks ?? []);
  const [activeWeek, setActiveWeek] = useState(1);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("4-Week Strength Block");
  const [showAi, setShowAi] = useState(false);

  const selectedProfile = VISUAL_PROFILES.find((p) => p.id === visualId);
  const currentWeek = weeks.find((w) => w.week === activeWeek);

  const nutrition = useMemo(() => {
    const base = selectedProfile?.fatEst ?? 22;
    const tdee = 2000 + (goal === "muscle" ? 300 : goal === "fatloss" ? -200 : 100);
    const protein = Math.round((selectedProfile?.muscleEst ?? 40) * 3.2);
    return { tdee, protein, carbs: Math.round((tdee - protein * 4) * 0.45 / 4), fat: Math.round((tdee - protein * 4) * 0.25 / 9), baseFat: base };
  }, [selectedProfile, goal]);

  const canPublish =
    assessment?.status === "completed" &&
    assessment.parqCleared &&
    !assessment.referralRequired;

  function generatePlan() {
    setWeeks(buildFourWeekPlan(daysPerWeek, goal));
    setActiveWeek(1);
  }

  function swapExercise(weekNum: number, dayKey: string, exerciseId: string) {
    setWeeks((prev) =>
      prev.map((w) => {
        if (w.week !== weekNum) return w;
        return {
          ...w,
          days: w.days.map((d) => {
            if (d.key !== dayKey) return d;
            return {
              ...d,
              exercises: d.exercises.map((ex) => {
                if (ex.id !== exerciseId) return ex;
                const swapped = swapExerciseInPattern(ex.pattern, ex.name);
                return { ...ex, name: swapped.name, pattern: swapped.pattern };
              }),
            };
          }),
        };
      }),
    );
  }

  function updatePrescription(weekNum: number, dayKey: string, exerciseId: string, prescription: string) {
    setWeeks((prev) =>
      prev.map((w) => {
        if (w.week !== weekNum) return w;
        return {
          ...w,
          days: w.days.map((d) => {
            if (d.key !== dayKey) return d;
            return {
              ...d,
              exercises: d.exercises.map((ex) =>
                ex.id === exerciseId ? { ...ex, prescription } : ex,
              ),
            };
          }),
        };
      }),
    );
  }

  function updateTargetReps(weekNum: number, dayKey: string, exerciseId: string, targetReps: string) {
    setWeeks((prev) =>
      prev.map((w) => {
        if (w.week !== weekNum) return w;
        return {
          ...w,
          days: w.days.map((d) => {
            if (d.key !== dayKey) return d;
            return {
              ...d,
              exercises: d.exercises.map((ex) =>
                ex.id === exerciseId ? { ...ex, targetReps } : ex,
              ),
            };
          }),
        };
      }),
    );
  }

  function updateSetPlan(weekNum: number, dayKey: string, exerciseId: string, setPlan: SetPrescription) {
    setWeeks((prev) =>
      prev.map((w) => {
        if (w.week !== weekNum) return w;
        return {
          ...w,
          days: w.days.map((d) => {
            if (d.key !== dayKey) return d;
            return {
              ...d,
              exercises: d.exercises.map((ex) =>
                ex.id === exerciseId ? { ...ex, setPlan } : ex,
              ),
            };
          }),
        };
      }),
    );
  }

  async function saveDraft() {
    setLoading(true);
    const content = { weeks, goal, daysPerWeek, visualProfile: visualId, nutrition };
    const res = programmeId
      ? await fetch("/api/programmes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: programmeId, title, content }),
        })
      : await fetch("/api/programmes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId, title, content, status: "draft" }),
        });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  async function publish() {
    if (!programmeId && weeks.length === 0) {
      await saveDraft();
    }
    setLoading(true);
    if (!programmeId) {
      const content = { weeks, goal, daysPerWeek, visualProfile: visualId, nutrition };
      const createRes = await fetch("/api/programmes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, title, content, status: "draft" }),
      });
      const data = await createRes.json();
      if (createRes.ok && data.programme?.id) {
        await fetch("/api/programmes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: data.programme.id, publish: true }),
        });
      }
    } else {
      await fetch("/api/programmes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: programmeId, content: { weeks, goal, daysPerWeek, visualProfile: visualId, nutrition }, publish: true }),
      });
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_200px]">
        <div className="rounded-lg border border-[var(--workspace-border)] p-4">
          <h3 className="font-semibold">Intake — {memberName}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="text-[var(--workspace-muted)]">Goal</span>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2"
              >
                <option value="muscle">Muscle / strength</option>
                <option value="fatloss">Fat loss</option>
                <option value="performance">Performance</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-[var(--workspace-muted)]">Days / week</span>
              <select
                value={daysPerWeek}
                onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2"
              >
                {[2, 3, 4, 5].map((d) => (
                  <option key={d} value={d}>{d} days</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-[var(--workspace-muted)]">Program title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2"
              />
            </label>
          </div>
          <Button type="button" className="mt-3" size="sm" onClick={generatePlan}>
            Generate 4-week block
          </Button>
        </div>

        <div className="rounded-lg border border-[var(--workspace-border)] p-4 text-center">
          <div className="text-xs text-[var(--workspace-muted)]">Body visual profile</div>
          <div
            className="mx-auto mt-2 h-32 w-24"
            dangerouslySetInnerHTML={{ __html: silhouette(visualId) }}
          />
          <select
            value={visualId}
            onChange={(e) => setVisualId(e.target.value)}
            className="mt-2 w-full rounded-md border border-[var(--workspace-border)] px-2 py-1 text-xs"
          >
            {VISUAL_PROFILES.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {weeks.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {weeks.map((w) => (
              <button
                key={w.week}
                type="button"
                onClick={() => setActiveWeek(w.week)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  activeWeek === w.week
                    ? "bg-[var(--workspace-accent)] text-[var(--workspace-accent-text,#fff)]"
                    : "border border-[var(--workspace-border)]"
                }`}
              >
                Week {w.week}
              </button>
            ))}
          </div>

          {currentWeek && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--workspace-muted)]">{currentWeek.label}</p>
              {currentWeek.days.map((day) => (
                <PrescriptionTableEditor
                  key={day.key}
                  dayLabel={day.label}
                  exercises={day.exercises}
                  onPrescriptionChange={(id, val) =>
                    updatePrescription(currentWeek.week, day.key, id, val)
                  }
                  onTargetRepsChange={(id, val) =>
                    updateTargetReps(currentWeek.week, day.key, id, val)
                  }
                  onSetPlanChange={(id, plan) =>
                    updateSetPlan(currentWeek.week, day.key, id, plan)
                  }
                  onSwap={(id) => swapExercise(currentWeek.week, day.key, id)}
                />
              ))}
            </div>
          )}

          <div className="rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-elevated)] p-4">
            <h4 className="font-medium">Nutrition block (estimate)</h4>
            <div className="mt-2 grid grid-cols-4 gap-3 text-sm">
              <div><span className="text-[var(--workspace-muted)]">TDEE</span><div className="font-semibold">{nutrition.tdee} kcal</div></div>
              <div><span className="text-[var(--workspace-muted)]">Protein</span><div className="font-semibold">{nutrition.protein}g</div></div>
              <div><span className="text-[var(--workspace-muted)]">Carbs</span><div className="font-semibold">{nutrition.carbs}g</div></div>
              <div><span className="text-[var(--workspace-muted)]">Fat</span><div className="font-semibold">{nutrition.fat}g</div></div>
            </div>
          </div>
        </>
      )}

      <div className="rounded-lg border border-dashed border-[var(--workspace-border)] p-4">
        <button
          type="button"
          className="text-sm font-semibold text-[var(--workspace-accent)]"
          onClick={() => setShowAi(!showAi)}
        >
          {showAi ? "Hide AI planner" : "Generate draft with AI →"}
        </button>
        {showAi && (
          <div className="mt-4">
            <WorkoutPlannerPanel clients={[{ id: memberId, name: memberName, goal: goal }]} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" disabled={loading || weeks.length === 0} onClick={saveDraft}>
          Save draft
        </Button>
        {status !== "active" && (
          <>
            {!canPublish && (
              <p className="text-sm text-[var(--status-warning)]">
                Complete a cleared PAR-Q assessment before publishing.{" "}
                <a href={`/app/clients/${memberId}/assessment`} className="font-semibold underline">
                  Open assessment →
                </a>
              </p>
            )}
            <Button type="button" disabled={loading || weeks.length === 0 || !canPublish} onClick={publish}>
              {loading ? "Publishing…" : "Publish to client"}
            </Button>
          </>
        )}
        {status === "active" && <Badge tone="success">Published — client can view in portal</Badge>}
      </div>
    </div>
  );
}
