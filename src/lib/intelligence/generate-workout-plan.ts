import { ollamaChat, isOllamaAvailable } from "@/lib/ollama";
import { buildExplanation, type AiExplanation } from "@/lib/intelligence/explain";
import { retrieveContextRanked } from "@/lib/rag";
import type { getMemberContextForAi } from "@/modules/queries";

type MemberContext = NonNullable<Awaited<ReturnType<typeof getMemberContextForAi>>>;

function fallbackPlan(weeks: number) {
  return `# ${weeks}-Week Foundation Plan (offline template)

## Week structure
- 3 sessions per week (Mon / Wed / Fri)
- Day A: Squat pattern, push, core
- Day B: Hinge pattern, pull, carry
- Day C: Single-leg, press, conditioning finisher

## Progression
Add 2.5 kg to primary lifts when all sets complete at RPE ≤ 8.

> Start Ollama for AI-personalised plans: \`ollama serve\` then pull \`llama3.2\``;
}

export async function generateWorkoutPlan(input: {
  context: MemberContext;
  weeks: number;
  daysPerWeek: number;
  experience?: string;
  injuries?: string;
  focus?: string;
}): Promise<{
  plan: string;
  explanation: AiExplanation;
  modelSource: string;
}> {
  const focus = input.focus ?? input.context.member.goal ?? "general strength";
  const ragQuery = `workout programme ${input.context.member.goal ?? "strength"} ${focus} ${input.weeks} weeks`;
  const rankedSources = retrieveContextRanked(ragQuery, 5);
  const knowledge = rankedSources.map((r) => `[${r.source}]\n${r.content}`).join("\n\n---\n\n");

  const explanation = buildExplanation(input.context, rankedSources, [
    `Plan shape: ${input.weeks} weeks × ${input.daysPerWeek} days.`,
    `Experience tier: ${input.experience ?? "beginner"}.`,
    input.injuries ? `Injury/limit notes considered: ${input.injuries}.` : "No injury limits supplied.",
  ]);

  const memberSummary = JSON.stringify(
    {
      name: input.context.member.name,
      goal: input.context.member.goal,
      experience: input.experience ?? "beginner",
      injuries: input.injuries ?? null,
      daysPerWeek: input.daysPerWeek,
      assessmentScores: input.context.latestAssessment?.scores ?? null,
      referralRequired: input.context.latestAssessment?.referralRequired ?? false,
    },
    null,
    2,
  );

  if (!(await isOllamaAvailable())) {
    return {
      plan: fallbackPlan(input.weeks),
      explanation,
      modelSource: "fallback",
    };
  }

  const plan = await ollamaChat([
    {
      role: "system",
      content: `You are a strength & conditioning coach at LMNT Fitness Club.
Design a structured workout plan using the knowledge base templates.
Include weekly split, exercises, sets/reps, and progression notes.
Keep it safe — respect referral flags. Use markdown headings.`,
    },
    {
      role: "user",
      content: `Knowledge base:
${knowledge}

Member:
${memberSummary}

Create a ${input.weeks}-week plan, ${input.daysPerWeek} days per week.
Focus: ${focus}.
Experience: ${input.experience ?? "beginner"}.
${input.injuries ? `Injuries/limits: ${input.injuries}` : ""}`,
    },
  ]);

  return {
    plan,
    explanation,
    modelSource: "ollama+rag",
  };
}
