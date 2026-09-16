export const MOVEMENT_PATTERNS = ["squat", "hinge", "push", "pull", "core"] as const;

export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number];

export function computeReadinessScore(scores: Record<string, number>, parqCleared: boolean) {
  const movementKeys = MOVEMENT_PATTERNS.filter((p) => scores[p] != null);
  if (movementKeys.length === 0) return parqCleared ? 60 : 30;

  const avg =
    movementKeys.reduce((sum, key) => sum + (scores[key] ?? 0), 0) / movementKeys.length;
  const movementScore = (avg / 5) * 70;
  const parqBonus = parqCleared ? 30 : 0;
  return Math.round(Math.min(100, movementScore + parqBonus));
}

export function readinessLabel(score: number) {
  if (score >= 80) return { label: "Ready to train", tone: "success" as const };
  if (score >= 60) return { label: "Train with caution", tone: "warning" as const };
  return { label: "Refer or regress", tone: "danger" as const };
}

export function suggestNextBlock(completedSessions: number, avgRpe: number | null, painFlags: number) {
  if (painFlags > 0) return "Hold current block — address pain before progressing.";
  if (avgRpe != null && avgRpe >= 8.5) return "Consolidate — maintain loads, improve quality.";
  if (completedSessions >= 8) return "Progress — advance load or reps on earned patterns.";
  if (completedSessions >= 4) return "Build — add volume within RPE 7–8.";
  return "Baseline — establish technique and repeatable effort.";
}
