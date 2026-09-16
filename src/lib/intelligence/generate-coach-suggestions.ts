import { ollamaChat, isOllamaAvailable } from "@/lib/ollama";
import {
  buildExplanation,
  parseNumberedSuggestions,
  type AiExplanation,
} from "@/lib/intelligence/explain";
import { retrieveContextRanked } from "@/lib/rag";
import type { getMemberContextForAi } from "@/modules/queries";

type MemberContext = NonNullable<Awaited<ReturnType<typeof getMemberContextForAi>>>;

const FALLBACK_SUGGESTIONS = [
  "Confirm their goal and how they felt since the last session.",
  "Review PAR-Q flags before loading new movements.",
  "Ask about sleep, stress, and any pain above 3/10.",
  "Reference their programme focus and celebrate one win from last week.",
  "Set a clear intent for today's session (strength, technique, or recovery).",
];

function scenarioHint(scenario?: string, topic?: string) {
  switch (scenario) {
    case "consult":
      return "CLOSE OS sales consult: discovery questions, buying signals, objection handling, clear next step";
    case "renewal":
      return "renewal conversation: value recap, objection on price, commitment close";
    case "lead":
      return "lead enquiry: qualify goal, timeline, budget sensitivity, book consult";
    case "floor":
      return "floor coaching: live cues, breathing, pain check, regressions";
    case "progress":
      return "progress check: plateau, adherence, scale vs performance metrics";
    default:
      return topic ?? "Prepare for upcoming session";
  }
}

export async function generateCoachSuggestions(input: {
  context: MemberContext;
  scenario?: string;
  topic?: string;
}): Promise<{
  suggestions: string[];
  raw: string;
  explanation: AiExplanation;
  modelSource: string;
  note?: string;
}> {
  const hint = scenarioHint(input.scenario, input.topic);
  const ragQuery = `${input.context.member.goal ?? "general fitness"} ${hint} coaching conversation`;
  const rankedSources = retrieveContextRanked(ragQuery);
  const knowledge = rankedSources.map((r) => `[${r.source}]\n${r.content}`).join("\n\n---\n\n");

  const explanation = buildExplanation(input.context, rankedSources, [
    `Scenario focus: ${hint}.`,
  ]);

  const memberSummary = JSON.stringify(
    {
      name: input.context.member.name,
      goal: input.context.member.goal,
      assessment: input.context.latestAssessment
        ? {
            status: input.context.latestAssessment.status,
            parqCleared: input.context.latestAssessment.parqCleared,
            referralRequired: input.context.latestAssessment.referralRequired,
            scores: input.context.latestAssessment.scores,
          }
        : null,
      programme: input.context.activeProgramme?.title ?? null,
      recentSessions: input.context.recentSessions.map((s) => ({
        date: s.scheduledAt,
        status: s.status,
        readiness: s.readinessScore,
        pain: s.painFlag,
      })),
    },
    null,
    2,
  );

  if (!(await isOllamaAvailable())) {
    return {
      suggestions: FALLBACK_SUGGESTIONS,
      raw: FALLBACK_SUGGESTIONS.map((s, i) => `${i + 1}. ${s}`).join("\n"),
      explanation,
      modelSource: "fallback",
      note: "Ollama is offline — start it with: ollama serve",
    };
  }

  const raw = await ollamaChat([
    {
      role: "system",
      content: `You are an expert fitness coach assistant for LMNT Fitness Club.
Use the knowledge base and member data to suggest what the trainer should say or ask.
Be concise, practical, and safe. Never diagnose medical conditions.
Format as numbered talking points (5-7 items).`,
    },
    {
      role: "user",
      content: `Knowledge base:
${knowledge}

Member data:
${memberSummary}

Topic / scenario: ${hint}

Provide conversation suggestions for the trainer.`,
    },
  ]);

  const suggestions = parseNumberedSuggestions(raw);

  return {
    suggestions: suggestions.length > 0 ? suggestions : FALLBACK_SUGGESTIONS,
    raw,
    explanation,
    modelSource: "ollama+rag",
  };
}
