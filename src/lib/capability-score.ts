import { MOVEMENT_PATTERNS } from "@/lib/coach-pro/readiness";

export type LifestyleLevel = "low" | "moderate" | "high";
export type NutritionLevel = "poor" | "fair" | "good";

export type CapabilityIntake = {
  parq: {
    chestPain: boolean;
    boneJoint: boolean;
    bloodPressure: boolean;
    dizziness: boolean;
    otherRisk: boolean;
  };
  lifestyle: {
    activityLevel: LifestyleLevel;
    stress: LifestyleLevel;
    nutrition: NutritionLevel;
    sleepHours: number;
  };
  medical: {
    conditions: string;
    medications: string;
    injuries: string;
    clearanceObtained: boolean;
  };
  fitness: {
    trainingAgeMonths: number;
    movementScores: Record<string, number>;
  };
};

export type CapabilityProfile = {
  bucket: "foundation" | "build" | "perform" | "refer";
  daysPerWeek: number;
  immediateGoal: string;
  longTermGoal: string;
  rationale: string;
};

const LEVEL_SCORE: Record<LifestyleLevel, number> = { low: 0, moderate: 8, high: 15 };
const NUTRITION_SCORE: Record<NutritionLevel, number> = { poor: 0, fair: 6, good: 12 };

export function computeCapability(intake: CapabilityIntake): { score: number; profile: CapabilityProfile } {
  const parqHits = Object.values(intake.parq).filter(Boolean).length;
  if (parqHits >= 2 || (parqHits >= 1 && !intake.medical.clearanceObtained)) {
    return {
      score: Math.max(0, 25 - parqHits * 8),
      profile: {
        bucket: "refer",
        daysPerWeek: 0,
        immediateGoal: "Obtain medical clearance and reassess readiness",
        longTermGoal: "Return to structured training with coach-led progression",
        rationale:
          "Multiple PAR-Q risks or missing clearance — defer loading until a clinician signs off.",
      },
    };
  }

  let score = 40;

  const movementKeys = MOVEMENT_PATTERNS.filter((p) => intake.fitness.movementScores[p] != null);
  if (movementKeys.length > 0) {
    const avg =
      movementKeys.reduce((s, k) => s + (intake.fitness.movementScores[k] ?? 0), 0) / movementKeys.length;
    score += (avg / 5) * 25;
  }

  score += Math.min(18, intake.fitness.trainingAgeMonths / 2);
  score += LEVEL_SCORE[intake.lifestyle.activityLevel];
  score += LEVEL_SCORE[intake.lifestyle.stress] * 0.5;
  score += NUTRITION_SCORE[intake.lifestyle.nutrition];

  if (intake.lifestyle.sleepHours >= 7) score += 10;
  else if (intake.lifestyle.sleepHours >= 6) score += 5;
  else score -= 5;

  if (intake.medical.injuries.trim()) score -= 5;
  if (intake.medical.clearanceObtained) score += 5;

  score = Math.round(Math.min(100, Math.max(0, score)));

  let bucket: CapabilityProfile["bucket"];
  let daysPerWeek: number;
  let immediateGoal: string;
  let longTermGoal: string;
  let rationale: string;

  if (score < 45) {
    bucket = "foundation";
    daysPerWeek = 2;
    immediateGoal = "Rebuild consistency — technique, mobility, and habit";
    longTermGoal = "Progress to 3–4 structured sessions per week";
    rationale =
      "Low training age, sleep, or movement scores — start with manageable frequency and movement quality.";
  } else if (score < 70) {
    bucket = "build";
    daysPerWeek = 3;
    immediateGoal = "Establish progressive overload with recovery buffers";
    longTermGoal = "Raise work capacity and movement competency";
    rationale =
      "Moderate capability — three focused days balances recovery with adaptation for most lifestyles.";
  } else {
    bucket = "perform";
    daysPerWeek = 4;
    immediateGoal = "Pursue performance blocks with periodised load";
    longTermGoal = "Sport or physique outcome with measurable milestones";
    rationale =
      "Solid sleep, training age, and movement screen — four days is sustainable for advanced responders.";
  }

  return { score, profile: { bucket, daysPerWeek, immediateGoal, longTermGoal, rationale } };
}

export const DEFAULT_CAPABILITY_INTAKE: CapabilityIntake = {
  parq: {
    chestPain: false,
    boneJoint: false,
    bloodPressure: false,
    dizziness: false,
    otherRisk: false,
  },
  lifestyle: {
    activityLevel: "moderate",
    stress: "moderate",
    nutrition: "fair",
    sleepHours: 7,
  },
  medical: {
    conditions: "",
    medications: "",
    injuries: "",
    clearanceObtained: false,
  },
  fitness: {
    trainingAgeMonths: 6,
    movementScores: Object.fromEntries(MOVEMENT_PATTERNS.map((p) => [p, 3])),
  },
};