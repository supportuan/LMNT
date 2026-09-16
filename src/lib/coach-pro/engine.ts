export type VisualProfile = {
  id: string;
  name: string;
  type: "C" | "I" | "D";
  desc: string;
  fatEst: number;
  muscleEst: number;
};

export const VISUAL_PROFILES: VisualProfile[] = [
  { id: "c1", name: "Higher fat / lower muscle", type: "C", desc: "Soft profile, lower visible muscularity", fatEst: 32, muscleEst: 32 },
  { id: "c2", name: "Higher fat / moderate muscle", type: "C", desc: "Larger frame with some muscular base", fatEst: 28, muscleEst: 38 },
  { id: "i1", name: "Balanced / average", type: "I", desc: "Moderate fat and muscle", fatEst: 22, muscleEst: 40 },
  { id: "i2", name: "Lean / recreationally trained", type: "I", desc: "Leaner with moderate muscle", fatEst: 17, muscleEst: 43 },
  { id: "d1", name: "Muscular", type: "D", desc: "Higher muscularity, moderate fat", fatEst: 15, muscleEst: 47 },
  { id: "d2", name: "Very lean / muscular", type: "D", desc: "High muscle with low fat", fatEst: 11, muscleEst: 50 },
];

export function silhouette(kind: string) {
  const widths: Record<string, number[]> = {
    c1: [31, 45, 38],
    c2: [34, 47, 42],
    i1: [30, 39, 34],
    i2: [30, 36, 31],
    d1: [37, 34, 34],
    d2: [39, 31, 32],
  };
  const w = widths[kind] ?? [30, 39, 34];
  return `<svg viewBox="0 0 100 130" aria-hidden="true">
<circle cx="50" cy="17" r="10" fill="#111"/>
<path d="M${50 - w[0] / 2} 31 Q50 26 ${50 + w[0] / 2} 31 L${50 + w[1] / 2} 72 Q${50 + w[2] / 2} 88 64 119 L55 119 L50 83 L45 119 L36 119 Q${50 - w[2] / 2} 88 ${50 - w[1] / 2} 72 Z" fill="#111"/>
<line x1="${50 - w[0] / 2}" y1="38" x2="20" y2="82" stroke="#111" stroke-width="9" stroke-linecap="round"/>
<line x1="${50 + w[0] / 2}" y1="38" x2="80" y2="82" stroke="#111" stroke-width="9" stroke-linecap="round"/>
</svg>`;
}

export type SetPrescription = {
  sets: number;
  reps: string;
  weight: string;
  rest: string;
  rpe: string;
};

export type ExerciseRow = {
  id: string;
  name: string;
  pattern: string;
  prescription: string;
  targetReps: string;
  setPlan?: SetPrescription;
};

export function formatPrescription(plan: SetPrescription): string {
  const base = `${plan.sets} × ${plan.reps}`;
  const extras: string[] = [];
  if (plan.weight) extras.push(`@ ${plan.weight}`);
  if (plan.rpe) extras.push(`RPE ${plan.rpe}`);
  if (plan.rest) extras.push(`rest ${plan.rest}`);
  return extras.length ? `${base} ${extras.join(" · ")}` : base;
}

export function defaultSetPlan(reps: string): SetPrescription {
  return { sets: 3, reps, weight: "", rest: "90s", rpe: "7–8" };
}

export type DayPlan = {
  key: string;
  label: string;
  exercises: ExerciseRow[];
};

export type WeekPlan = {
  week: number;
  label: string;
  days: DayPlan[];
};

export type SessionLog = {
  dayKey: string;
  date: string;
  rpe: number | null;
  volume: number | null;
  weight: number | null;
  hang: number | null;
  energy: string;
  pain: string;
  note: string;
};

const PATTERNS = ["squat", "hinge", "push", "pull", "core", "cardio"] as const;

export const EXERCISES: Record<string, string[]> = {
  squat: ["Barbell back squat", "Goblet squat", "Box squat"],
  hinge: ["Romanian deadlift", "Kettlebell deadlift", "Cable pull-through"],
  push: ["Barbell bench press", "Dumbbell bench press", "Push-up"],
  pull: ["Pull-up / pulldown", "Cable row", "Band row"],
  core: ["Farmer carry", "Dead bug", "Plank"],
  cardio: ["Bike intervals", "Incline walk", "Row intervals"],
};

export function buildFourWeekPlan(daysPerWeek: number, goal: string): WeekPlan[] {
  const weekLabels = [
    "BASELINE · establish technique and repeatable RPE",
    "BUILD · increase useful volume while keeping quality",
    "PROGRESS · advance earned load/reps",
    "CONSOLIDATE + REASSESS · review outcomes",
  ];
  const reps = goal === "muscle" ? "8–12" : goal === "fatloss" ? "10–15" : "6–10";

  return [1, 2, 3, 4].map((week) => ({
    week,
    label: weekLabels[week - 1],
    days: Array.from({ length: daysPerWeek }, (_, d) => {
      const key = `w${week}d${d + 1}`;
      return {
        key,
        label: `Day ${d + 1}`,
        exercises: PATTERNS.map((p, i) => {
          const targetReps = reps;
          const setPlan = defaultSetPlan(reps);
          setPlan.sets = 3 + (week > 2 ? 1 : 0);
          return {
            id: `${key}e${i}`,
            name: EXERCISES[p][Math.min(week - 1, EXERCISES[p].length - 1)],
            pattern: p,
            prescription: formatPrescription(setPlan),
            targetReps,
            setPlan,
          };
        }),
      };
    }),
  }));
}


/** Swap to the next exercise in the same movement pattern — preserves programming intent. */
export function swapExerciseInPattern(pattern: string, currentName: string) {
  const options = EXERCISES[pattern as keyof typeof EXERCISES];
  if (!options?.length) {
    return { name: currentName, pattern };
  }
  const idx = options.indexOf(currentName);
  const next = options[(idx + 1) % options.length];
  return { name: next, pattern };
}

/** @deprecated Session logs are persisted via workout-complete API */
export function loadSessionLogs(_clientKey: string): SessionLog[] {
  return [];
}

/** @deprecated Session logs are persisted via workout-complete API */
export function saveSessionLog(_clientKey: string, _log: SessionLog) {
  // no-op — use /api/client/workout-complete
}
