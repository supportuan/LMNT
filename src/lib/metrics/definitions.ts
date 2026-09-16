/**
 * Canonical metric definitions — all dashboards and reports should use getMetric()
 * so the same label always maps to the same query logic.
 */
export const METRIC_DEFINITIONS = {
  leadConversionRate: {
    id: "lead.conversion_rate",
    label: "Lead conversion rate",
    description: "Won leads ÷ (won + lost) in scope.",
    unit: "percent" as const,
  },
  activePipeline: {
    id: "lead.active_pipeline",
    label: "Active pipeline",
    description: "Leads in new, contacted, consultation, or trial stages.",
    unit: "count" as const,
  },
  trainerUtilisation: {
    id: "coach.pt_utilisation",
    label: "PT utilisation",
    description: "Average trainer session load vs weekly capacity over 30 days.",
    unit: "percent" as const,
  },
  retentionRate: {
    id: "coach.retention_rate",
    label: "Retention rate",
    description: "Active packages ÷ active members in scope.",
    unit: "percent" as const,
  },
  adherenceRate: {
    id: "coach.adherence_rate",
    label: "Session adherence",
    description: "Completed sessions ÷ scheduled (non-cancelled) in the last 30 days.",
    unit: "percent" as const,
  },
  membersTotal: {
    id: "business.members_total",
    label: "Total members",
    description: "All member records in scope.",
    unit: "count" as const,
  },
  sessionsTotal: {
    id: "business.sessions_total",
    label: "Sessions logged",
    description: "All session records in scope.",
    unit: "count" as const,
  },
  leadsTotal: {
    id: "business.leads_total",
    label: "Total leads",
    description: "All lead records in scope.",
    unit: "count" as const,
  },
  attendanceToday: {
    id: "business.attendance_today",
    label: "Check-ins today",
    description: "Attendance records since midnight local DB date.",
    unit: "count" as const,
  },
  sessionsToday: {
    id: "business.sessions_today",
    label: "Today's sessions",
    description: "Non-cancelled sessions scheduled for today.",
    unit: "count" as const,
  },
  monthlyRevenue: {
    id: "business.monthly_revenue",
    label: "Monthly revenue",
    description: "Sum of payment_records.amount_inr since month start.",
    unit: "inr" as const,
  },
  membersDelta30d: {
    id: "business.members_delta_30d",
    label: "New members (30d vs prior 30d)",
    description: "Percent change in new member records.",
    unit: "percent" as const,
  },
  leadsDelta30d: {
    id: "business.leads_delta_30d",
    label: "New leads (30d vs prior 30d)",
    description: "Percent change in new lead records.",
    unit: "percent" as const,
  },
  orgRevenue: {
    id: "business.revenue_collected",
    label: "Revenue collected",
    description: "Sum of active package value minus amount due in scope.",
    unit: "inr" as const,
  },
  activeTrainers: {
    id: "coach.active_trainers",
    label: "Active trainers",
    description: "Trainers with active user status in scope.",
    unit: "count" as const,
  },
} as const;

export type MetricId = (typeof METRIC_DEFINITIONS)[keyof typeof METRIC_DEFINITIONS]["id"];

export type MetricUnit = "percent" | "count" | "inr";

export type MetricResult = {
  id: MetricId;
  value: number;
  unit: MetricUnit;
  label: string;
  description: string;
  detail?: Record<string, unknown>;
};

export const ALL_METRIC_IDS = Object.values(METRIC_DEFINITIONS).map((m) => m.id);

export function metricDefinition(metricId: MetricId) {
  return Object.values(METRIC_DEFINITIONS).find((m) => m.id === metricId);
}
