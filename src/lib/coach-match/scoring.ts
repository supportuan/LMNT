/** Explainable CoachMatch scoring — weights are fixed and surfaced in UI. */
export const MATCH_WEIGHTS = {
  goalFit: { weight: 0.35, label: "Goal fit" },
  branchFit: { weight: 0.25, label: "Branch proximity" },
  capacity: { weight: 0.2, label: "Coaching capacity" },
  credentials: { weight: 0.2, label: "Verified credentials" },
} as const;

export type TrainerMatchInput = {
  id: string;
  name: string;
  centreId: string;
  centreName: string;
  specialties: string[];
  bio: string;
  sessionsPerWeek: string;
  verifiedCredentialCount: number;
};

export type MemberMatchInput = {
  goal: string | null;
  centreId: string | null;
};

export type MatchScoreBreakdown = {
  goalFit: number;
  branchFit: number;
  capacity: number;
  credentials: number;
};

export type MatchScoreResult = {
  score: number;
  reasons: string[];
  breakdown: MatchScoreBreakdown;
};

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

export function scoreTrainerMatch(
  member: MemberMatchInput,
  trainer: TrainerMatchInput,
): MatchScoreResult {
  const reasons: string[] = [];
  const breakdown: MatchScoreBreakdown = {
    goalFit: 0,
    branchFit: 0,
    capacity: 0,
    credentials: 0,
  };

  const goalTokens = tokenize(member.goal ?? "");
  const specialtyText = trainer.specialties.join(" ").toLowerCase();
  const bioText = trainer.bio.toLowerCase();

  const goalOverlap =
    goalTokens.length > 0 &&
    goalTokens.some(
      (token) =>
        specialtyText.includes(token) ||
        bioText.includes(token) ||
        trainer.specialties.some((s) => s.toLowerCase().includes(token)),
    );

  breakdown.goalFit = goalOverlap ? 92 : goalTokens.length > 0 ? 48 : 65;
  if (goalOverlap && member.goal) {
    reasons.push(`Specialties align with your goal: “${member.goal}”.`);
  } else if (member.goal) {
    reasons.push(`Coach covers general fitness; your goal “${member.goal}” is a partial keyword fit.`);
  } else {
    reasons.push("Set a goal on your profile for tighter matching.");
  }

  if (member.centreId && member.centreId === trainer.centreId) {
    breakdown.branchFit = 100;
    reasons.push(`Same branch — ${trainer.centreName}.`);
  } else if (member.centreId) {
    breakdown.branchFit = 62;
    reasons.push(`Coaches at ${trainer.centreName} (different from your home branch).`);
  } else {
    breakdown.branchFit = 75;
    reasons.push(`Available at ${trainer.centreName}.`);
  }

  const weeklyCap = Number(trainer.sessionsPerWeek.match(/\d+/)?.[0] ?? 5);
  breakdown.capacity = weeklyCap >= 6 ? 90 : weeklyCap >= 4 ? 78 : 60;
  reasons.push(`Typical load: ${trainer.sessionsPerWeek}.`);

  if (trainer.verifiedCredentialCount > 0) {
    breakdown.credentials = Math.min(100, 72 + trainer.verifiedCredentialCount * 8);
    reasons.push(
      `${trainer.verifiedCredentialCount} verified credential${trainer.verifiedCredentialCount === 1 ? "" : "s"}.`,
    );
  } else {
    breakdown.credentials = 42;
    reasons.push("No verified credentials on file yet.");
  }

  const score = Math.round(
    breakdown.goalFit * MATCH_WEIGHTS.goalFit.weight +
      breakdown.branchFit * MATCH_WEIGHTS.branchFit.weight +
      breakdown.capacity * MATCH_WEIGHTS.capacity.weight +
      breakdown.credentials * MATCH_WEIGHTS.credentials.weight,
  );

  return { score, reasons, breakdown };
}
