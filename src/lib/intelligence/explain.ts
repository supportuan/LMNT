import type { RankedKnowledgeChunk } from "@/lib/rag";
import type { getMemberContextForAi } from "@/modules/queries";

type MemberContext = NonNullable<Awaited<ReturnType<typeof getMemberContextForAi>>>;

export type AiExplanation = {
  reasons: string[];
  sources: { id: string; source: string; score: number }[];
  signals: { label: string; value: string }[];
  safetyFlags: string[];
};

export function buildMemberSignals(context: MemberContext) {
  const signals: { label: string; value: string }[] = [
    { label: "Goal", value: context.member.goal ?? "Not set" },
    {
      label: "Assessment",
      value: context.latestAssessment?.status ?? "None on file",
    },
    {
      label: "Active programme",
      value: context.activeProgramme?.title ?? "None",
    },
    {
      label: "Recent sessions",
      value: String(context.recentSessions.length),
    },
  ];

  if (context.latestAssessment?.referralRequired) {
    signals.push({ label: "Referral gate", value: "Required before loading" });
  }

  const painSessions = context.recentSessions.filter((s) => s.painFlag);
  if (painSessions.length > 0) {
    signals.push({ label: "Recent pain flags", value: String(painSessions.length) });
  }

  return signals;
}

export function buildSafetyFlags(context: MemberContext): string[] {
  const flags: string[] = [];

  if (!context.latestAssessment) {
    flags.push("No assessment on file — verify PAR-Q before progressive loading.");
  } else if (!context.latestAssessment.parqCleared) {
    flags.push("PAR-Q not cleared — keep intensity conservative.");
  }

  if (context.latestAssessment?.referralRequired) {
    flags.push("Medical referral flagged — do not escalate load without clearance.");
  }

  if (context.recentSessions.some((s) => s.painFlag)) {
    flags.push("Recent session reported pain — screen before new movements.");
  }

  const lowReadiness = context.recentSessions.filter(
    (s) => s.readinessScore != null && s.readinessScore < 6,
  );
  if (lowReadiness.length > 0) {
    flags.push("Low readiness scores recently — consider recovery or deload.");
  }

  return flags;
}

export function buildExplanation(
  context: MemberContext,
  rankedSources: RankedKnowledgeChunk[],
  extraReasons: string[] = [],
): AiExplanation {
  const reasons = [
    context.member.goal
      ? `Recommendations weighted toward goal: “${context.member.goal}”.`
      : "Member goal not set — using general coaching playbook.",
    context.activeProgramme
      ? `Active programme “${context.activeProgramme.title}” informs session continuity.`
      : "No active programme — suggestions focus on discovery and safety.",
    ...extraReasons,
  ];

  if (rankedSources.length > 0) {
    reasons.push(
      `Grounded in ${rankedSources.length} knowledge chunk${rankedSources.length === 1 ? "" : "s"} from LMNT playbook.`,
    );
  }

  return {
    reasons,
    sources: rankedSources.map((s) => ({
      id: s.id,
      source: s.source,
      score: s.score,
    })),
    signals: buildMemberSignals(context),
    safetyFlags: buildSafetyFlags(context),
  };
}

export function parseNumberedSuggestions(text: string): string[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const numbered = lines
    .map((line) => line.replace(/^\d+[\).\s-]+/, "").trim())
    .filter(Boolean);

  if (numbered.length >= 3) return numbered.slice(0, 10);
  return lines.slice(0, 10);
}
