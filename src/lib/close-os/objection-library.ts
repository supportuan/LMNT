export type ObjectionEntry = {
  keys: string[];
  title: string;
  types: string[];
  route: string;
};

export const OBJECTION_LIBRARY: ObjectionEntry[] = [
  {
    keys: ["expensive", "cost", "price", "afford", "budget"],
    title: "“PT is too expensive.”",
    types: [
      "Genuine affordability",
      "Low value perception",
      "Low trust",
      "Comparison",
      "Negotiation",
      "Low urgency",
      "Fear of wasting money",
    ],
    route: "Do not defend the price immediately. Ask whether the barrier is the amount itself or confidence that the service is worth it. If affordability is genuine, change product/scope—not the same PT service at a panic discount.",
  },
  {
    keys: ["discount", "cheaper", "reduce price"],
    title: "“Can you discount it?”",
    types: ["Negotiation", "Budget", "Value test"],
    route: "Protect price integrity. Re-anchor to the outcome and deliverables. If the budget is real, offer a legitimately different lower-touch service.",
  },
  {
    keys: ["extra sessions", "free sessions", "more sessions"],
    title: "“Can you add sessions?”",
    types: ["Negotiation", "Value test"],
    route: "Do not add unlimited inventory to force a close. Explain why the package is structured as it is; add clarity/onboarding/tracking value rather than diluting session value.",
  },
  {
    keys: ["think about", "let me think", "consider it"],
    title: "“I need to think about it.”",
    types: ["Hidden objection", "Decision anxiety", "Escape from pressure"],
    route: "Give space, then diagnose gently: “Of course. What specifically do you want to think through—fit, time, investment or confidence this will work?”",
  },
  {
    keys: ["spouse", "wife", "husband", "parents", "parent", "family"],
    title: "“I need to ask my spouse/parents.”",
    types: ["Decision authority", "Budget", "Exit"],
    route: "Respect the decision structure. Ask what the other decision-maker will need to know and offer a concise summary or joint call if appropriate.",
  },
  {
    keys: ["no time", "busy", "schedule", "timing"],
    title: "“I don’t have time.”",
    types: ["Logistics", "Low priority", "Overwhelm"],
    route: "Quantify the real constraint. Find a minimum viable schedule. Do not shame them for being busy.",
  },
  {
    keys: ["youtube", "myself", "own workout", "train myself"],
    title: "“I can do it myself / information is free.”",
    types: ["Value perception", "Autonomy"],
    route: "Agree information is abundant. Differentiate coaching with assessment, individualization, progression, execution feedback, accountability and course-correction.",
  },
  {
    keys: ["trainer before", "didn't work", "did not work", "bad trainer"],
    title: "“I tried PT before and it didn’t work.”",
    types: ["Trust", "Risk", "Previous disappointment"],
    route: "Explore what failed, what they expected and what must be different. Then show how your process addresses those specific gaps.",
  },
  {
    keys: ["one month", "trial month", "try first"],
    title: "“I want to try for one month.”",
    types: ["Risk reduction", "Affordability", "Commitment"],
    route: "Clarify what they want to validate. Set realistic expectations for one month and offer a legitimate starter product if appropriate.",
  },
  {
    keys: ["workout plan", "program only", "plan only"],
    title: "“I only need a workout plan.”",
    types: ["Autonomy", "Budget", "Scope"],
    route: "If programming-only truly fits, sell it as its own product. If their barrier requires supervision, explain that gap without forcing full PT.",
  },
  {
    keys: ["not fit enough", "get fit first", "too unfit"],
    title: "“I’m not fit enough for PT yet.”",
    types: ["Intimidation", "Self-efficacy"],
    route: "Reframe coaching as the bridge from their current level. Explain how assessment and progression start where they are.",
  },
  {
    keys: ["quit", "give up", "motivation", "inconsistent"],
    title: "“I’m scared I’ll quit again.”",
    types: ["Commitment confidence", "Past behavior"],
    route: "Explore past drop-off triggers. Sell the accountability/process design, not just workouts. Create small early commitments and milestones.",
  },
  {
    keys: ["fast results", "quick results", "how fast"],
    title: "“I need results fast.”",
    types: ["Expectation", "Urgency"],
    route: "Preserve motivation while setting credible expectations. Define early measurable wins and avoid guaranteed transformation claims.",
  },
  {
    keys: ["other trainer", "another trainer", "cheaper trainer", "competitor"],
    title: "“Another trainer is cheaper.”",
    types: ["Comparison", "Price anchoring"],
    route: "Do not attack the competitor. Compare scope, process, support and fit; allow the prospect to decide whether the difference matters.",
  },
  {
    keys: ["pay later", "emi", "installment", "instalment"],
    title: "“Can I pay later / EMI?”",
    types: ["Cash flow", "Affordability"],
    route: "Clarify whether cash flow is the only barrier. Offer only genuine payment structures supported by the business.",
  },
  {
    keys: ["just price", "tell me price", "how much"],
    title: "“Just tell me the price.”",
    types: ["Screening", "Low patience", "Comparison"],
    route: "Answer transparently, then earn context: “Packages start at X. Before I recommend one, can I understand what you’re trying to solve?”",
  },
  {
    keys: ["next month", "later", "after vacation", "after exams"],
    title: "“I’ll start later.”",
    types: ["Real timing constraint", "Procrastination", "Low urgency"],
    route: "Ask what will meaningfully change by then. If the constraint is real, schedule a legitimate follow-up. If not, uncover the hesitation.",
  },
  {
    keys: ["guarantee", "guaranteed"],
    title: "“Can you guarantee results?”",
    types: ["Risk", "Trust"],
    route: "Do not guarantee an outcome you cannot control. Explain what you control—assessment, programming, coaching, monitoring—and what requires adherence.",
  },
  {
    keys: ["gym trust", "don't trust", "do not trust", "scam"],
    title: "“I don’t trust trainers/gyms.”",
    types: ["Trust", "Previous harm"],
    route: "Slow the sale. Ask what created the belief, demonstrate process/boundaries and use proof only where relevant.",
  },
];
