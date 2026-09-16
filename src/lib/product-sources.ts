/**
 * Maps LMNT modules to their source prototypes.
 * Coach Life OS → index.html
 * CLOSE OS → index-49.html
 * Daddy Strong Coach Pro → index-31.html
 * Coach Mirror → coach-mirror-career-v4.html
 * Choose Your Coach live site → network admin + CoachMatch (future)
 */
export const PRODUCT_SOURCES = {
  trainer: {
    closeOs: {
      source: "CLOSE OS (index-49.html)",
      features: ["Live STT", "Consult MRI", "Objection library", "Prospect CRM"],
    },
    coachMirror: {
      source: "Coach Mirror (coach-mirror-career-v4.html)",
      features: ["Scenario quiz", "Career pathway", "Income model", "Start today checklist"],
    },
    coachPro: {
      source: "Daddy Strong Coach Pro (index-31.html)",
      features: ["Body map", "4-week blocks", "Session log", "Analytics"],
    },
    schedule: {
      source: "Coach Life OS (index.html)",
      features: ["Today hero", "Week timetable", "Next client", "Session load"],
    },
    onboarding: {
      source: "Coach OS architecture + Coach Life client onboarding",
      features: ["Checklist", "PAR-Q gate", "First programme assignment"],
    },
    aiCoach: {
      source: "Coach Mirror + CLOSE OS Live Assist",
      features: ["Scenario prompts", "Talk suggestions", "Objection-aware RAG"],
    },
    workoutPlanner: {
      source: "Daddy Strong Coach Pro (index-31.html)",
      features: ["Intake form", "Week blocks", "Exercise prescriptions", "AI plan"],
    },
    clients: {
      source: "Coach Life OS Clients tab",
      features: ["Client cards", "Goal", "Coaching relationship"],
    },
  },
  client: {
    coachMatch: {
      source: "Choose Your Coach — CoachMatch marketplace",
      features: ["Browse trainers", "Filter by branch", "Book consult"],
    },
    journey: {
      source: "Choose Your Coach — client portal",
      features: ["Goal", "Upcoming sessions", "Assessment status"],
    },
    workoutPlan: {
      source: "Daddy Strong Coach Pro results view",
      features: ["Active programme", "Week structure", "Session logging (future)"],
    },
  },
  centre_manager: {
    staff: { source: "Coach OS — centre roster", features: ["Role assignments"] },
    assets: { source: "Coach OS operations", features: ["Equipment register", "Downtime"] },
    inventory: { source: "Coach OS operations", features: ["Stock", "Reorder levels"] },
  },
  admin: {
    analytics: {
      source: "Choose Your Coach admin overview",
      features: ["Branch capacity", "Retention", "PT utilisation", "Lead pipeline"],
    },
  },
} as const;

/** Coach Mirror scenario types for AI talk suggestions */
export const COACH_SCENARIOS = [
  { id: "lead", label: "Lead enquiry", prompt: "first enquiry pricing and goal discovery" },
  { id: "first_session", label: "First session", prompt: "first training session priorities PAR-Q movement" },
  { id: "floor", label: "Floor coaching", prompt: "live technique correction pain fatigue" },
  { id: "progress", label: "Progress check", prompt: "plateau scale unchanged adherence review" },
  { id: "renewal", label: "Renewal / price", prompt: "renewal objection budget conversation" },
  { id: "consult", label: "Sales consult", prompt: "CLOSE OS consultation discovery buying signals" },
] as const;

export type CoachScenarioId = (typeof COACH_SCENARIOS)[number]["id"];
