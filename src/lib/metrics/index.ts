import type { SessionPayload } from "@/lib/session";
import { scopedCentreIds } from "@/lib/branch-scope";
import { metricCacheKey, withMetricCache } from "@/lib/metrics/cache";
import {
  computeActiveTrainers,
  computeAdherenceRate,
  computeAttendanceToday,
  computeBranchMetrics,
  computeLeadsTotal,
  computeMembersTotal,
  computeMonthlyRevenue,
  computePtUtilisationAverage,
  computeRetentionRate,
  computeSessionsToday,
  computeSessionsTotal,
  getAnalyticsDeltas,
  getLeadFunnelMetrics,
  getOrgRevenue,
  getTrainerUtilisation,
} from "@/lib/metrics/compute";
import {
  ALL_METRIC_IDS,
  METRIC_DEFINITIONS,
  metricDefinition,
  type MetricId,
  type MetricResult,
} from "@/lib/metrics/definitions";

export {
  ALL_METRIC_IDS,
  METRIC_DEFINITIONS,
  metricDefinition,
  type MetricId,
  type MetricResult,
};
export { computeBranchMetrics, type BranchMetricRow } from "@/lib/metrics/compute";
export { clearMetricCache } from "@/lib/metrics/cache";

async function computeMetricUncached(
  session: SessionPayload,
  metricId: MetricId,
): Promise<MetricResult> {
  const def = metricDefinition(metricId);
  if (!def) throw new Error(`Unknown metric: ${metricId}`);

  switch (metricId) {
    case METRIC_DEFINITIONS.leadConversionRate.id:
    case METRIC_DEFINITIONS.activePipeline.id: {
      const funnel = await getLeadFunnelMetrics(session);
      return {
        id: metricId,
        label: def.label,
        description: def.description,
        unit: def.unit,
        value:
          metricId === METRIC_DEFINITIONS.leadConversionRate.id
            ? funnel.winRate
            : funnel.activePipeline,
        detail: { funnel },
      };
    }
    case METRIC_DEFINITIONS.trainerUtilisation.id: {
      const trainers = await getTrainerUtilisation(session);
      const value = await computePtUtilisationAverage(session);
      return {
        id: metricId,
        label: def.label,
        description: def.description,
        unit: def.unit,
        value,
        detail: { trainers },
      };
    }
    case METRIC_DEFINITIONS.retentionRate.id:
      return {
        id: metricId,
        label: def.label,
        description: def.description,
        unit: def.unit,
        value: await computeRetentionRate(session),
      };
    case METRIC_DEFINITIONS.adherenceRate.id:
      return {
        id: metricId,
        label: def.label,
        description: def.description,
        unit: def.unit,
        value: await computeAdherenceRate(session),
      };
    case METRIC_DEFINITIONS.membersTotal.id:
      return {
        id: metricId,
        label: def.label,
        description: def.description,
        unit: def.unit,
        value: await computeMembersTotal(session),
      };
    case METRIC_DEFINITIONS.sessionsTotal.id:
      return {
        id: metricId,
        label: def.label,
        description: def.description,
        unit: def.unit,
        value: await computeSessionsTotal(session),
      };
    case METRIC_DEFINITIONS.leadsTotal.id:
      return {
        id: metricId,
        label: def.label,
        description: def.description,
        unit: def.unit,
        value: await computeLeadsTotal(session),
      };
    case METRIC_DEFINITIONS.attendanceToday.id:
      return {
        id: metricId,
        label: def.label,
        description: def.description,
        unit: def.unit,
        value: await computeAttendanceToday(session),
      };
    case METRIC_DEFINITIONS.sessionsToday.id:
      return {
        id: metricId,
        label: def.label,
        description: def.description,
        unit: def.unit,
        value: await computeSessionsToday(session),
      };
    case METRIC_DEFINITIONS.monthlyRevenue.id:
      return {
        id: metricId,
        label: def.label,
        description: def.description,
        unit: def.unit,
        value: await computeMonthlyRevenue(session),
      };
    case METRIC_DEFINITIONS.activeTrainers.id:
      return {
        id: metricId,
        label: def.label,
        description: def.description,
        unit: def.unit,
        value: await computeActiveTrainers(session),
      };
    case METRIC_DEFINITIONS.membersDelta30d.id:
    case METRIC_DEFINITIONS.leadsDelta30d.id: {
      const deltas = await getAnalyticsDeltas(session);
      return {
        id: metricId,
        label: def.label,
        description: def.description,
        unit: def.unit,
        value:
          metricId === METRIC_DEFINITIONS.membersDelta30d.id
            ? deltas.membersDelta
            : deltas.leadsDelta,
        detail: { deltas },
      };
    }
    case METRIC_DEFINITIONS.orgRevenue.id: {
      const revenue = await getOrgRevenue(session);
      return {
        id: metricId,
        label: def.label,
        description: def.description,
        unit: def.unit,
        value: revenue.collected,
        detail: { revenue },
      };
    }
    default: {
      const _exhaustive: never = metricId;
      throw new Error(`Unknown metric: ${_exhaustive}`);
    }
  }
}

/** Fetch a canonical metric by id for the current session scope (cached 60s). */
export async function getMetric(session: SessionPayload, metricId: MetricId): Promise<MetricResult> {
  const key = metricCacheKey(
    session.organisationId,
    session.activeRole,
    scopedCentreIds(session) ?? session.centreIds,
    metricId,
    session.activeCentreId ?? "all",
  );
  return withMetricCache(key, () => computeMetricUncached(session, metricId));
}

/** Batch-fetch metrics — deduplicates ids and uses per-metric cache. */
export async function getMetricsBundle(session: SessionPayload, metricIds: MetricId[]) {
  const unique = [...new Set(metricIds)];
  const entries = await Promise.all(
    unique.map(async (id) => [id, await getMetric(session, id)] as const),
  );
  return Object.fromEntries(entries) as Record<MetricId, MetricResult>;
}

export async function getBusinessMetrics(session: SessionPayload) {
  const bundle = await getMetricsBundle(session, [
    METRIC_DEFINITIONS.leadConversionRate.id,
    METRIC_DEFINITIONS.activePipeline.id,
    METRIC_DEFINITIONS.membersDelta30d.id,
    METRIC_DEFINITIONS.leadsDelta30d.id,
    METRIC_DEFINITIONS.orgRevenue.id,
  ]);

  const revenue = bundle[METRIC_DEFINITIONS.orgRevenue.id].detail?.revenue as
    | Awaited<ReturnType<typeof getOrgRevenue>>
    | undefined;

  return {
    leadConversionRate: bundle[METRIC_DEFINITIONS.leadConversionRate.id].value,
    activePipeline: bundle[METRIC_DEFINITIONS.activePipeline.id].value,
    membersDelta30d: bundle[METRIC_DEFINITIONS.membersDelta30d.id].value,
    leadsDelta30d: bundle[METRIC_DEFINITIONS.leadsDelta30d.id].value,
    revenueCollected: bundle[METRIC_DEFINITIONS.orgRevenue.id].value,
    revenuePending: revenue?.totalDue ?? 0,
  };
}

/** Snapshot used by Reports and Analytics — single canonical source. */
export async function getReportingSnapshot(session: SessionPayload) {
  const metricIds = [
    METRIC_DEFINITIONS.membersTotal.id,
    METRIC_DEFINITIONS.sessionsTotal.id,
    METRIC_DEFINITIONS.leadsTotal.id,
    METRIC_DEFINITIONS.attendanceToday.id,
    METRIC_DEFINITIONS.trainerUtilisation.id,
    METRIC_DEFINITIONS.retentionRate.id,
    METRIC_DEFINITIONS.adherenceRate.id,
    METRIC_DEFINITIONS.orgRevenue.id,
    METRIC_DEFINITIONS.membersDelta30d.id,
    METRIC_DEFINITIONS.leadsDelta30d.id,
  ] as MetricId[];

  const [metrics, branches, trainers] = await Promise.all([
    getMetricsBundle(session, metricIds),
    computeBranchMetrics(session),
    getTrainerUtilisation(session),
  ]);

  const revenue = metrics[METRIC_DEFINITIONS.orgRevenue.id].detail?.revenue as
    | Awaited<ReturnType<typeof getOrgRevenue>>
    | undefined;

  return {
    metrics,
    branches,
    trainers,
    members: metrics[METRIC_DEFINITIONS.membersTotal.id].value,
    leads: metrics[METRIC_DEFINITIONS.leadsTotal.id].value,
    sessions: metrics[METRIC_DEFINITIONS.sessionsTotal.id].value,
    attendanceToday: metrics[METRIC_DEFINITIONS.attendanceToday.id].value,
    retentionRate: metrics[METRIC_DEFINITIONS.retentionRate.id].value,
    adherenceRate: metrics[METRIC_DEFINITIONS.adherenceRate.id].value,
    ptUtilisation: metrics[METRIC_DEFINITIONS.trainerUtilisation.id].value,
    revenue: revenue ?? (await getOrgRevenue(session)),
    deltas: {
      membersDelta: metrics[METRIC_DEFINITIONS.membersDelta30d.id].value,
      leadsDelta: metrics[METRIC_DEFINITIONS.leadsDelta30d.id].value,
    },
  };
}

/** Admin dashboard KPIs from canonical metrics. */
export async function getAdminMetricsSnapshot(session: SessionPayload) {
  const bundle = await getMetricsBundle(session, [
    METRIC_DEFINITIONS.membersTotal.id,
    METRIC_DEFINITIONS.activeTrainers.id,
    METRIC_DEFINITIONS.sessionsToday.id,
    METRIC_DEFINITIONS.monthlyRevenue.id,
    METRIC_DEFINITIONS.retentionRate.id,
    METRIC_DEFINITIONS.adherenceRate.id,
  ]);

  return {
    members: bundle[METRIC_DEFINITIONS.membersTotal.id].value,
    activeTrainers: bundle[METRIC_DEFINITIONS.activeTrainers.id].value,
    todaySessions: bundle[METRIC_DEFINITIONS.sessionsToday.id].value,
    monthlyRevenue: bundle[METRIC_DEFINITIONS.monthlyRevenue.id].value,
    retentionRate: bundle[METRIC_DEFINITIONS.retentionRate.id].value,
    adherenceRate: bundle[METRIC_DEFINITIONS.adherenceRate.id].value,
  };
}
