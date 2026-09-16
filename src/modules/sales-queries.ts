import { and, count, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceRecords,
  consultationReports,
  leads,
  memberPlans,
  members,
  orgPackages,
  paymentRecords,
  sessions,
} from "@/db/schema";
import { orgAndCentreScope, scopedCentreIds } from "@/lib/branch-scope";
import type { ConsultReport } from "@/lib/close-os/analysis";
import { computeCoachDnaFromReports } from "@/lib/close-os/coach-dna";
import type { SessionPayload } from "@/lib/session";
import { trainerCollectedInr } from "@/lib/trainer-share";

const PIPELINE_STAGES = ["new", "contacted", "consultation", "trial", "won", "lost"] as const;

export type PipelineLead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  stage: string;
  source: string;
  notes: string | null;
  nextAction: string | null;
  updatedAt: Date;
  reportCount: number;
};

export async function getLeadsPipeline(session: SessionPayload): Promise<PipelineLead[]> {
  let condition = orgAndCentreScope(session, leads.organisationId, leads.centreId);

  if (session.activeRole === "trainer") {
    condition = and(condition, eq(leads.ownerId, session.userId))!;
  }

  const rows = await db
    .select()
    .from(leads)
    .where(condition)
    .orderBy(desc(leads.updatedAt));

  const result: PipelineLead[] = [];
  for (const l of rows) {
    const [reports] = await db
      .select({ value: count() })
      .from(consultationReports)
      .where(eq(consultationReports.leadId, l.id));
    result.push({
      id: l.id,
      name: l.name,
      email: l.email,
      phone: l.phone,
      stage: l.stage,
      source: l.source,
      notes: l.notes,
      nextAction: l.nextAction,
      updatedAt: l.updatedAt,
      reportCount: reports?.value ?? 0,
    });
  }
  return result;
}

export function groupLeadsByStage(leadsList: PipelineLead[]) {
  return PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = leadsList.filter((l) => l.stage === stage);
      return acc;
    },
    {} as Record<string, PipelineLead[]>,
  );
}

export function reportToConsultReport(row: typeof consultationReports.$inferSelect): ConsultReport {
  return {
    id: row.id,
    date: row.createdAt.toISOString(),
    name: row.prospectName,
    goal: row.goal ?? "",
    stage: row.lifeStage ?? "",
    price: row.priceDiscussed ?? "",
    raw: row.transcript,
    total: row.totalScore,
    scores: row.scores,
    st: row.speakerStats,
    q: row.questionCount,
    oq: row.openQuestionCount,
    obs: row.objections ?? [],
    buy: row.buyingSignals ?? [],
    persona: row.persona ?? "",
    diag: row.diagnosis ?? "",
    followup: row.followupMessage ?? "",
  };
}

export async function getConsultationReports(session: SessionPayload, leadId?: string) {
  let condition = orgAndCentreScope(
    session,
    consultationReports.organisationId,
    consultationReports.centreId,
  );

  if (session.activeRole === "trainer") {
    condition = and(condition, eq(consultationReports.trainerId, session.userId))!;
  }
  if (leadId) {
    condition = and(condition, eq(consultationReports.leadId, leadId))!;
  }

  const rows = await db
    .select()
    .from(consultationReports)
    .where(condition)
    .orderBy(desc(consultationReports.createdAt))
    .limit(50);

  return rows.map(reportToConsultReport);
}

export async function getCoachDna(session: SessionPayload) {
  const trainerId =
    session.activeRole === "trainer" ? session.userId : session.userId;

  const rows = await db
    .select()
    .from(consultationReports)
    .where(
      and(
        eq(consultationReports.organisationId, session.organisationId),
        eq(consultationReports.trainerId, trainerId),
      ),
    )
    .orderBy(desc(consultationReports.createdAt))
    .limit(20);

  if (rows.length === 0) return null;

  const reports = rows.map(reportToConsultReport);
  return computeCoachDnaFromReports(reports);
}

export async function getOrgRevenue(session: SessionPayload) {
  const planCondition = orgAndCentreScope(session, memberPlans.organisationId, memberPlans.centreId);

  const plans = await db
    .select({
      packageValue: memberPlans.packageValue,
      amountDue: memberPlans.amountDue,
      status: memberPlans.status,
      centreId: memberPlans.centreId,
    })
    .from(memberPlans)
    .where(and(planCondition, eq(memberPlans.status, "active")));

  const totalPackage = plans.reduce((s, p) => s + p.packageValue, 0);
  const totalDue = plans.reduce((s, p) => s + p.amountDue, 0);
  const collected = totalPackage - totalDue;

  const memberCondition = orgAndCentreScope(session, members.organisationId, members.centreId);
  const [activeMembers] = await db
    .select({ value: count() })
    .from(members)
    .where(and(memberCondition, eq(members.status, "active")));

  return {
    totalPackage,
    totalDue,
    collected,
    activePackages: plans.length,
    activeMembers: activeMembers.value,
    collectionRate: totalPackage > 0 ? Math.round((collected / totalPackage) * 100) : 0,
  };
}

export async function getOrgPackages(session: SessionPayload) {
  return db
    .select()
    .from(orgPackages)
    .where(eq(orgPackages.organisationId, session.organisationId))
    .orderBy(orgPackages.name);
}

export async function getAnalyticsDeltas(session: SessionPayload) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);
  const memberScope = orgAndCentreScope(session, members.organisationId, members.centreId);
  const leadScope = orgAndCentreScope(session, leads.organisationId, leads.centreId);

  function pctDelta(recent: number, prior: number) {
    if (prior === 0) return recent > 0 ? 100 : 0;
    return Math.round(((recent - prior) / prior) * 100);
  }

  const membersRecent = await db
    .select({ value: count() })
    .from(members)
    .where(and(memberScope, gte(members.createdAt, thirtyDaysAgo)));
  const membersPrior = await db
    .select({ value: count() })
    .from(members)
    .where(
      and(
        memberScope,
        gte(members.createdAt, sixtyDaysAgo),
        lt(members.createdAt, thirtyDaysAgo),
      ),
    );

  const leadsRecent = await db
    .select({ value: count() })
    .from(leads)
    .where(and(leadScope, gte(leads.createdAt, thirtyDaysAgo)));
  const leadsPrior = await db
    .select({ value: count() })
    .from(leads)
    .where(
      and(leadScope, gte(leads.createdAt, sixtyDaysAgo), lt(leads.createdAt, thirtyDaysAgo)),
    );

  return {
    membersDelta: pctDelta(membersRecent[0]?.value ?? 0, membersPrior[0]?.value ?? 0),
    leadsDelta: pctDelta(leadsRecent[0]?.value ?? 0, leadsPrior[0]?.value ?? 0),
  };
}

const FUNNEL_STAGES = ["new", "contacted", "consultation", "trial", "won", "lost"] as const;

export async function getLeadFunnelMetrics(session: SessionPayload) {
  let condition = orgAndCentreScope(session, leads.organisationId, leads.centreId);
  if (session.activeRole === "trainer") {
    condition = and(condition, eq(leads.ownerId, session.userId))!;
  }

  const rows = await db
    .select({ stage: leads.stage, value: count() })
    .from(leads)
    .where(condition)
    .groupBy(leads.stage);

  const counts = Object.fromEntries(FUNNEL_STAGES.map((s) => [s, 0])) as Record<string, number>;
  rows.forEach((r) => {
    counts[r.stage] = r.value;
  });

  const activePipeline = counts.new + counts.contacted + counts.consultation + counts.trial;
  const winRate =
    counts.won + counts.lost > 0
      ? Math.round((counts.won / (counts.won + counts.lost)) * 100)
      : 0;

  return {
    stages: FUNNEL_STAGES.map((stage) => ({ stage, count: counts[stage] ?? 0 })),
    activePipeline,
    winRate,
    total: FUNNEL_STAGES.reduce((s, stage) => s + (counts[stage] ?? 0), 0),
  };
}

export async function getTrainerUtilisation(session: SessionPayload) {
  const { roleAssignments, sessions, trainerProfiles, users, centres, coachingRelationships } = await import("@/db/schema");

  let staffCondition = and(
    eq(roleAssignments.organisationId, session.organisationId),
    eq(roleAssignments.role, "trainer"),
  )!;
  const ids = scopedCentreIds(session);
  if (ids?.length) {
    staffCondition = and(staffCondition, inArray(roleAssignments.centreId, ids))!;
  }

  const trainers = await db
    .select({
      id: users.id,
      name: users.name,
      centreId: roleAssignments.centreId,
      centreName: centres.name,
      sessionsPerWeek: trainerProfiles.sessionsPerWeek,
    })
    .from(roleAssignments)
    .innerJoin(users, eq(roleAssignments.userId, users.id))
    .leftJoin(centres, eq(roleAssignments.centreId, centres.id))
    .leftJoin(trainerProfiles, eq(trainerProfiles.userId, users.id))
    .where(staffCondition);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const trainerIds = trainers.map((t) => t.id);
  const planRows =
    trainerIds.length === 0
      ? []
      : await db
          .select({
            trainerId: coachingRelationships.trainerId,
            packageValue: memberPlans.packageValue,
            amountDue: memberPlans.amountDue,
            trainerShareBps: memberPlans.trainerShareBps,
          })
          .from(memberPlans)
          .innerJoin(
            coachingRelationships,
            and(
              eq(coachingRelationships.memberId, memberPlans.memberId),
              eq(coachingRelationships.active, true),
              inArray(coachingRelationships.trainerId, trainerIds),
            ),
          )
          .where(and(eq(memberPlans.status, "active"), eq(memberPlans.organisationId, session.organisationId)));

  const revenueByTrainer = new Map<string, number>();
  for (const row of planRows) {
    revenueByTrainer.set(
      row.trainerId,
      (revenueByTrainer.get(row.trainerId) ?? 0) +
        trainerCollectedInr(row.packageValue, row.amountDue, row.trainerShareBps),
    );
  }

  const result = [];
  for (const t of trainers) {
    const [sessionCount] = await db
      .select({ value: count() })
      .from(sessions)
      .where(
        and(
          eq(sessions.trainerId, t.id),
          gte(sessions.scheduledAt, thirtyDaysAgo),
          eq(sessions.organisationId, session.organisationId),
        ),
      );

    const weeklyMatch = t.sessionsPerWeek?.match(/(\d+)/);
    const weeklyCap = weeklyMatch ? Number(weeklyMatch[1]) : 10;
    const monthlyCapacity = weeklyCap * 4;
    const sessionTotal = sessionCount?.value ?? 0;
    const utilisation = monthlyCapacity > 0 ? Math.min(100, Math.round((sessionTotal / monthlyCapacity) * 100)) : 0;

    result.push({
      trainerId: t.id,
      name: t.name,
      centreName: t.centreName ?? "—",
      sessions30d: sessionTotal,
      monthlyCapacity,
      utilisation,
      revenue: revenueByTrainer.get(t.id) ?? 0,
    });
  }

  return result.sort((a, b) => b.utilisation - a.utilisation);
}

export type AnalyticsTrendPoint = {
  date: string;
  sessions: number;
  leads: number;
  checkIns: number;
};

export async function getAnalyticsTimeSeries(session: SessionPayload): Promise<AnalyticsTrendPoint[]> {
  const days = 30;
  const now = new Date();
  const start = new Date(now.getTime() - days * 86400000);

  const sessionScope = orgAndCentreScope(session, sessions.organisationId, sessions.centreId);
  const leadScope = orgAndCentreScope(session, leads.organisationId, leads.centreId);
  const attendanceScope = orgAndCentreScope(
    session,
    attendanceRecords.organisationId,
    attendanceRecords.centreId,
  );

  const [sessionRows, leadRows, checkInRows] = await Promise.all([
    db
      .select({ at: sessions.completedAt, scheduled: sessions.scheduledAt })
      .from(sessions)
      .where(and(sessionScope, gte(sessions.scheduledAt, start))),
    db
      .select({ at: leads.createdAt })
      .from(leads)
      .where(and(leadScope, gte(leads.createdAt, start))),
    db
      .select({ at: attendanceRecords.checkedInAt })
      .from(attendanceRecords)
      .where(and(attendanceScope, gte(attendanceRecords.checkedInAt, start))),
  ]);

  function dayKey(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  const buckets = new Map<string, AnalyticsTrendPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = dayKey(d);
    buckets.set(key, { date: key, sessions: 0, leads: 0, checkIns: 0 });
  }

  for (const row of sessionRows) {
    const ts = row.at ?? row.scheduled;
    const key = dayKey(ts);
    const bucket = buckets.get(key);
    if (bucket) bucket.sessions += 1;
  }
  for (const row of leadRows) {
    const key = dayKey(row.at);
    const bucket = buckets.get(key);
    if (bucket) bucket.leads += 1;
  }
  for (const row of checkInRows) {
    const key = dayKey(row.at);
    const bucket = buckets.get(key);
    if (bucket) bucket.checkIns += 1;
  }

  return Array.from(buckets.values());
}

export type RevenueTrendPoint = {
  date: string;
  collected: number;
};

export async function getRevenueTimeSeries(session: SessionPayload): Promise<RevenueTrendPoint[]> {
  const days = 30;
  const now = new Date();
  const start = new Date(now.getTime() - days * 86400000);

  const paymentScope = orgAndCentreScope(
    session,
    paymentRecords.organisationId,
    paymentRecords.centreId,
  );

  const rows = await db
    .select({ at: paymentRecords.createdAt, amount: paymentRecords.amountInr })
    .from(paymentRecords)
    .where(and(paymentScope, gte(paymentRecords.createdAt, start)));

  function dayKey(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  const buckets = new Map<string, RevenueTrendPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = dayKey(d);
    buckets.set(key, { date: key, collected: 0 });
  }

  for (const row of rows) {
    const key = dayKey(row.at);
    const bucket = buckets.get(key);
    if (bucket) bucket.collected += row.amount;
  }

  return Array.from(buckets.values());
}
