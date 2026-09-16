import type { sessionFeedback, sessions } from "@/db/schema";

type SessionRow = Pick<typeof sessions.$inferSelect, "rpe" | "painFlag">;
type FeedbackRow = Pick<
  typeof sessionFeedback.$inferSelect,
  "coachScore" | "energy" | "notes" | "memberScore"
>;

export type SessionClosureInput = {
  session: SessionRow;
  feedback: FeedbackRow | null;
  incomingRpe?: number | null;
  incomingEnergy?: string | null;
  incomingNotes?: string | null;
};

export class SessionClosureValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionClosureValidationError";
  }
}

export function validateSessionClosure(input: SessionClosureInput) {
  const rpe = input.incomingRpe ?? input.session.rpe ?? input.feedback?.coachScore ?? null;
  const energy = (input.incomingEnergy ?? input.feedback?.energy ?? "").trim();
  const notes = (input.incomingNotes ?? input.feedback?.notes ?? "").trim();

  const missing: string[] = [];
  if (rpe == null || rpe < 1 || rpe > 10) missing.push("session RPE (1–10)");
  if (!energy) missing.push("energy level");
  if (!notes) missing.push("coach session notes");

  if (missing.length > 0) {
    throw new SessionClosureValidationError(
      `Complete feedback before closing: ${missing.join(", ")}.`,
    );
  }

  if (input.session.painFlag && notes.length < 10) {
    throw new SessionClosureValidationError(
      "Pain was reported — add detailed coach notes (at least 10 characters) before closing.",
    );
  }

  return { rpe: rpe as number, energy, notes };
}

const LOW_RPE_THRESHOLD = 4;

export function shouldEscalateSession(input: {
  painFlag: boolean;
  rpe: number;
  energy: string;
  memberScore?: number | null;
}) {
  const reasons: string[] = [];
  if (input.painFlag) reasons.push("pain_flagged");
  if (input.rpe <= LOW_RPE_THRESHOLD) reasons.push("low_session_rpe");
  if (input.energy.toLowerCase() === "low") reasons.push("low_energy");
  if (input.memberScore != null && input.memberScore <= LOW_RPE_THRESHOLD) {
    reasons.push("low_member_feedback");
  }
  return reasons;
}
