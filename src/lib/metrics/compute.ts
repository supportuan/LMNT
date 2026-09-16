import { and, count, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceRecords,
  centres,
  leads,
  memberPlans,
  members,
  paymentRecords,
  roleAssignments,
  sessions,
  users,
} from "@/db/schema";
import { orgAndCentreScope, centreScope, scopedCentreIds } from "@/lib/branch-scope";
import { startOfDay, startOfMonth } from "@/lib/format";
import type { SessionPayload } from "@/lib/session";
import {
  getAnalyticsDeltas,
  getLeadFunnelMetrics,
  getOrgRevenue,
  getTrainerUtilisation,
} from "@/modules/sales-queries";

export async function computeMembersTotal(session: SessionPayload) {
  const scope = orgAndCentreScope(session, members.organisationId, members.centreId);
  const [row] = await db.select({ value: count() }).from(members).where(scope);
  return row?.value ?? 0;
}

export async function computeSessionsTotal(session: SessionPayload) {
  const scope = orgAndCentreScope(session, sessions.organisationId, sessions.centreId);
  const [row] = await db.select({ value: count() }).from(sessions).where(scope);
  return row?.value ?? 0;
}

export async function computeLeadsTotal(session: SessionPayload) {
  const scope = orgAndCentreScope(session, leads.organisationId, leads.centreId);
  const [row] = await db.select({ value: count() }).from(leads).where(scope);
  return row?.value ?? 0;
}

export async function computeAttendanceToday(session: SessionPayload) {
  const [row] = await db
    .select({ value: count() })
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.organisationId, session.organisationId),
        sql`checked_in_at >= CURRENT_DATE`,
        ...(centreScope(session, attendanceRecords.centreId)
          ? [centreScope(session, attendanceRecords.centreId)!]
          : []),
      ),
    );
  return row?.value ?? 0;
}

export async function computeSessionsToday(session: SessionPayload) {
  const today = startOfDay();
  const tomorrow = new Date(today.getTime() + 86400000);
  const scope = orgAndCentreScope(session, sessions.organisationId, sessions.centreId);
  const [row] = await db
    .select({ value: count() })
    .from(sessions)
    .where(
      and(
        scope,
        gte(sessions.scheduledAt, today),
        lte(sessions.scheduledAt, tomorrow),
        ne(sessions.status, "cancelled"),
      ),
    );
  return row?.value ?? 0;
}

export async function computeMonthlyRevenue(session: SessionPayload) {
  const monthStart = startOfMonth();
  const scope = orgAndCentreScope(session, paymentRecords.organisationId, paymentRecords.centreId);
  const rows = await db
    .select({ amount: paymentRecords.amountInr })
    .from(paymentRecords)
    .where(and(scope, gte(paymentRecords.createdAt, monthStart)));
  return rows.reduce((sum, row) => sum + row.amount, 0);
}

export async function computeActiveTrainers(session: SessionPayload) {
  let condition = and(
    eq(roleAssignments.organisationId, session.organisationId),
    eq(roleAssignments.role, "trainer"),
    eq(users.status, "active"),
  )!;
  const ids = scopedCentreIds(session);
  if (ids?.length) {
    condition = and(condition, inArray(roleAssignments.centreId, ids))!;
  }
  const [row] = await db
    .select({ value: count() })
    .from(roleAssignments)
    .innerJoin(users, eq(roleAssignments.userId, users.id))
    .where(condition);
  return row?.value ?? 0;
}

/** Active packages ÷ active members — renewal / package attachment proxy. */
export async function computeRetentionRate(session: SessionPayload) {
  const revenue = await getOrgRevenue(session);
  if (revenue.activeMembers <= 0) return 0;
  return Math.min(100, Math.round((revenue.activePackages / revenue.activeMembers) * 100));
}

/** Completed sessions ÷ non-cancelled scheduled sessions in the last 30 days. */
export async function computeAdherenceRate(session: SessionPayload) {
  const since = new Date(Date.now() - 30 * 86400000);
  const scope = orgAndCentreScope(session, sessions.organisationId, sessions.centreId);

  const [completed] = await db
    .select({ value: count() })
    .from(sessions)
    .where(and(scope, gte(sessions.scheduledAt, since), eq(sessions.status, "completed")));

  const [scheduled] = await db
    .select({ value: count() })
    .from(sessions)
    .where(and(scope, gte(sessions.scheduledAt, since), ne(sessions.status, "cancelled")));

  const denom = scheduled?.value ?? 0;
  if (denom === 0) return 0;
  return Math.round(((completed?.value ?? 0) / denom) * 100);
}

export async function computePtUtilisationAverage(session: SessionPayload) {
  const rows = await getTrainerUtilisation(session);
  if (rows.length === 0) return 0;
  return Math.round(rows.reduce((sum, r) => sum + r.utilisation, 0) / rows.length);
}

export type BranchMetricRow = {
  name: string;
  capacity: number;
  members: number;
  sessions: number;
  utilisation: number;
  ptUtil: number;
};

export async function computeBranchMetrics(session: SessionPayload): Promise<BranchMetricRow[]> {
  const orgId = session.organisationId;
  const ids = scopedCentreIds(session);
  const centreRows = await db
    .select()
    .from(centres)
    .where(
      ids?.length
        ? and(eq(centres.organisationId, orgId), inArray(centres.id, ids))
        : eq(centres.organisationId, orgId),
    );

  return Promise.all(
    centreRows.map(async (centre) => {
      const [membersAtCentre] = await db
        .select({ value: count() })
        .from(members)
        .where(and(eq(members.centreId, centre.id), eq(members.status, "active")));
      const [sessionsAtCentre] = await db
        .select({ value: count() })
        .from(sessions)
        .where(eq(sessions.centreId, centre.id));
      const [trainersAtCentre] = await db
        .select({ value: count() })
        .from(roleAssignments)
        .where(and(eq(roleAssignments.centreId, centre.id), eq(roleAssignments.role, "trainer")));

      const utilisation =
        centre.capacity > 0
          ? Math.round((membersAtCentre.value / centre.capacity) * 100)
          : 0;
      const ptUtil =
        trainersAtCentre.value > 0
          ? Math.min(100, Math.round((sessionsAtCentre.value / (trainersAtCentre.value * 40)) * 100))
          : 0;

      return {
        name: centre.name,
        capacity: centre.capacity,
        members: membersAtCentre.value,
        sessions: sessionsAtCentre.value,
        utilisation,
        ptUtil,
      };
    }),
  );
}

export {
  getLeadFunnelMetrics,
  getAnalyticsDeltas,
  getOrgRevenue,
  getTrainerUtilisation,
};
