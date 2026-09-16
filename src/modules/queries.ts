import { and, count, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  assessments,
  assets,
  attendanceRecords,
  auditEntries,
  centres,
  coachingRelationships,
  inventoryItems,
  leads,
  memberPlans,
  members,
  onboardingAssignments,
  paymentRecords,
  programmes,
  roleAssignments,
  sessions,
  trainerProfiles,
  users,
} from "@/db/schema";
import { startOfDay, startOfMonth } from "@/lib/format";
import { trainerCollectedInr } from "@/lib/trainer-share";
import { assetNeedsAttention, assetUiStatus } from "@/lib/asset-status";
import type { SessionPayload } from "@/lib/session";
import { orgAndCentreScope, scopedCentreIds, withCentreScope } from "@/lib/branch-scope";
import { getReportingSnapshot } from "@/lib/metrics";

export async function getAnalytics(session: SessionPayload) {
  const snapshot = await getReportingSnapshot(session);
  return {
    members: snapshot.members,
    leads: snapshot.leads,
    sessions: snapshot.sessions,
    attendanceToday: snapshot.attendanceToday,
    branches: snapshot.branches,
    retentionRate: snapshot.retentionRate,
    adherenceRate: snapshot.adherenceRate,
    ptUtilisation: snapshot.ptUtilisation,
    revenue: snapshot.revenue,
    deltas: snapshot.deltas,
  };
}

export type StaffMember = {
  id: string;
  userId: string;
  role: string;
  centreId: string | null;
  userName: string;
  userEmail: string;
  userStatus: string;
};

export type StaffBranchSummary = {
  id: string;
  name: string;
  slug: string;
  capacity: number;
  memberCount: number;
  trainerCount: number;
  managerCount: number;
  totalStaff: number;
  activeStaff: number;
  utilisationPct: number;
};

const STAFF_ROLES = ["admin", "centre_manager", "trainer"] as const;

export async function getCentreStaff(
  session: SessionPayload,
  filters?: { branch?: string; role?: string; ignoreWorkspace?: boolean },
): Promise<StaffMember[]> {
  let condition = and(
    eq(roleAssignments.organisationId, session.organisationId),
    inArray(roleAssignments.role, [...STAFF_ROLES]),
  )!;

  if (!filters?.ignoreWorkspace) {
    const ids = scopedCentreIds(session);
    if (ids?.length) {
      condition = and(condition, inArray(roleAssignments.centreId, ids))!;
    }
  }

  const branch = filters?.branch ?? "all";
  if (branch === "org") {
    condition = and(condition, isNull(roleAssignments.centreId))!;
  } else if (branch !== "all") {
    condition = and(condition, eq(roleAssignments.centreId, branch))!;
  }

  const role = filters?.role ?? "all";
  if (role !== "all") {
    condition = and(condition, eq(roleAssignments.role, role as (typeof STAFF_ROLES)[number]))!;
  }

  return db
    .select({
      id: roleAssignments.id,
      userId: users.id,
      role: roleAssignments.role,
      centreId: roleAssignments.centreId,
      userName: users.name,
      userEmail: users.email,
      userStatus: users.status,
    })
    .from(roleAssignments)
    .innerJoin(users, eq(roleAssignments.userId, users.id))
    .where(condition)
    .orderBy(users.name);
}

export async function getStaffBranchSummaries(session: SessionPayload) {
  const centreRows =
    session.activeRole === "admin"
      ? await db
          .select()
          .from(centres)
          .where(eq(centres.organisationId, session.organisationId))
          .orderBy(centres.name)
      : session.centreIds.length > 0
        ? await db
            .select()
            .from(centres)
            .where(inArray(centres.id, session.centreIds))
            .orderBy(centres.name)
        : [];

  const allStaff = await getCentreStaff(session, { ignoreWorkspace: true });

  const branches: StaffBranchSummary[] = await Promise.all(
    centreRows.map(async (centre) => {
      const atCentre = allStaff.filter((s) => s.centreId === centre.id);
      const [memberCount] = await db
        .select({ value: count() })
        .from(members)
        .where(and(eq(members.centreId, centre.id), eq(members.status, "active")));

      const membersAtCentre = memberCount.value;
      return {
        id: centre.id,
        name: centre.name,
        slug: centre.slug,
        capacity: centre.capacity,
        memberCount: membersAtCentre,
        trainerCount: atCentre.filter((s) => s.role === "trainer").length,
        managerCount: atCentre.filter((s) => s.role === "centre_manager").length,
        totalStaff: atCentre.length,
        activeStaff: atCentre.filter((s) => s.userStatus === "active").length,
        utilisationPct: Math.round((membersAtCentre / centre.capacity) * 100),
      };
    }),
  );

  const orgWide = allStaff.filter((s) => !s.centreId);

  return {
    branches,
    orgWide: {
      totalStaff: orgWide.length,
      admins: orgWide.filter((s) => s.role === "admin").length,
    },
    totals: {
      totalStaff: allStaff.length,
      trainers: allStaff.filter((s) => s.role === "trainer").length,
      managers: allStaff.filter((s) => s.role === "centre_manager").length,
      active: allStaff.filter((s) => s.userStatus === "active").length,
    },
  };
}

export async function getAssets(session: SessionPayload) {
  const condition = withCentreScope(
    session,
    eq(assets.organisationId, session.organisationId),
    assets.centreId,
  );

  return db
    .select({
      id: assets.id,
      organisationId: assets.organisationId,
      centreId: assets.centreId,
      name: assets.name,
      category: assets.category,
      serialNumber: assets.serialNumber,
      location: assets.location,
      purchaseDate: assets.purchaseDate,
      purchaseCost: assets.purchaseCost,
      status: assets.status,
      assignedTrainerId: assets.assignedTrainerId,
      assignedArea: assets.assignedArea,
      warrantyUntil: assets.warrantyUntil,
      lastServiceAt: assets.lastServiceAt,
      nextMaintenanceAt: assets.nextMaintenanceAt,
      retiredAt: assets.retiredAt,
      notes: assets.notes,
      createdAt: assets.createdAt,
      assignedTrainerName: users.name,
    })
    .from(assets)
    .leftJoin(users, eq(assets.assignedTrainerId, users.id))
    .where(condition)
    .orderBy(assets.name);
}

export async function getInventory(session: SessionPayload) {
  const condition = withCentreScope(
    session,
    eq(inventoryItems.organisationId, session.organisationId),
    inventoryItems.centreId,
  );

  return db.select().from(inventoryItems).where(condition).orderBy(inventoryItems.name);
}

export async function getCentresForSession(session: SessionPayload) {
  if (session.activeRole === "admin") {
    return db
      .select({ id: centres.id, name: centres.name })
      .from(centres)
      .where(and(eq(centres.organisationId, session.organisationId), eq(centres.status, "active")))
      .orderBy(centres.name);
  }

  return session.centreIds.map((id) => ({
    id,
    name: session.centreNames[id] ?? id,
  }));
}

export async function getOnboardingAssignments(session: SessionPayload) {
  const condition = and(
    eq(onboardingAssignments.organisationId, session.organisationId),
    eq(onboardingAssignments.trainerId, session.userId),
  );

  return db
    .select({
      id: onboardingAssignments.id,
      status: onboardingAssignments.status,
      checklist: onboardingAssignments.checklist,
      dueAt: onboardingAssignments.dueAt,
      memberName: members.name,
      memberGoal: members.goal,
    })
    .from(onboardingAssignments)
    .innerJoin(members, eq(onboardingAssignments.memberId, members.id))
    .where(condition)
    .orderBy(desc(onboardingAssignments.createdAt));
}

export async function getTrainerClients(session: SessionPayload) {
  const rels = await db
    .select({ memberId: coachingRelationships.memberId })
    .from(coachingRelationships)
    .where(
      and(
        eq(coachingRelationships.trainerId, session.userId),
        eq(coachingRelationships.active, true),
      ),
    );

  const ids = rels.map((r) => r.memberId);
  if (ids.length === 0) return [];

  return db
    .select({
      id: members.id,
      name: members.name,
      goal: members.goal,
      email: members.email,
    })
    .from(members)
    .where(inArray(members.id, ids));
}

export async function getMemberContextForAi(memberId: string, organisationId: string) {
  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.organisationId, organisationId)))
    .limit(1);

  if (!member) return null;

  const [latestAssessment] = await db
    .select()
    .from(assessments)
    .where(eq(assessments.memberId, memberId))
    .orderBy(desc(assessments.createdAt))
    .limit(1);

  const [activeProgramme] = await db
    .select()
    .from(programmes)
    .where(and(eq(programmes.memberId, memberId), eq(programmes.status, "active")))
    .limit(1);

  const recentSessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.memberId, memberId))
    .orderBy(desc(sessions.scheduledAt))
    .limit(3);

  return { member, latestAssessment, activeProgramme, recentSessions };
}

export type ScheduleSession = {
  id: string;
  scheduledAt: string;
  status: string;
  memberName: string;
  programmeTitle: string | null;
  readinessScore: number | null;
  painFlag: boolean;
};

export async function getTrainerSchedule(session: SessionPayload): Promise<ScheduleSession[]> {
  const condition = and(
    eq(sessions.organisationId, session.organisationId),
    eq(sessions.trainerId, session.userId),
  );

  const rows = await db
    .select({
      id: sessions.id,
      scheduledAt: sessions.scheduledAt,
      status: sessions.status,
      memberName: members.name,
      programmeTitle: programmes.title,
      readinessScore: sessions.readinessScore,
      painFlag: sessions.painFlag,
    })
    .from(sessions)
    .innerJoin(members, eq(sessions.memberId, members.id))
    .leftJoin(programmes, eq(sessions.programmeId, programmes.id))
    .where(condition)
    .orderBy(sessions.scheduledAt);

  return rows.map((row) => ({ ...row, scheduledAt: row.scheduledAt.toISOString() }));
}

export async function getClientProgrammes(session: SessionPayload) {
  const memberRows = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.userId, session.userId));
  const ids = memberRows.map((m) => m.id);
  if (ids.length === 0) return [];

  return db
    .select()
    .from(programmes)
    .where(inArray(programmes.memberId, ids))
    .orderBy(desc(programmes.createdAt));
}

export async function getClientSessions(session: SessionPayload) {
  const memberRows = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.userId, session.userId));
  const ids = memberRows.map((m) => m.id);
  if (ids.length === 0) return [];

  return db.select().from(sessions).where(inArray(sessions.memberId, ids)).orderBy(desc(sessions.scheduledAt));
}

export async function getClientAssessments(session: SessionPayload) {
  const memberRows = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.userId, session.userId));
  const ids = memberRows.map((m) => m.id);
  if (ids.length === 0) return [];

  return db.select().from(assessments).where(inArray(assessments.memberId, ids)).orderBy(desc(assessments.createdAt));
}

export async function getClientAttendance(session: SessionPayload) {
  const memberRows = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.userId, session.userId));
  const ids = memberRows.map((m) => m.id);
  if (ids.length === 0) return [];

  return db
    .select()
    .from(attendanceRecords)
    .where(inArray(attendanceRecords.memberId, ids))
    .orderBy(desc(attendanceRecords.checkedInAt))
    .limit(20);
}

export async function getClientJourney(session: SessionPayload) {
  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.userId, session.userId))
    .limit(1);

  if (!member) return null;

  const [programme] = await db
    .select()
    .from(programmes)
    .where(and(eq(programmes.memberId, member.id), eq(programmes.status, "active")))
    .limit(1);

  const upcomingSessions = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.memberId, member.id), eq(sessions.status, "scheduled")))
    .orderBy(sessions.scheduledAt)
    .limit(3);

  const [assessment] = await db
    .select()
    .from(assessments)
    .where(eq(assessments.memberId, member.id))
    .orderBy(desc(assessments.createdAt))
    .limit(1);

  const [completedCount] = await db
    .select({ value: count() })
    .from(sessions)
    .where(and(eq(sessions.memberId, member.id), eq(sessions.status, "completed")));

  return {
    member,
    programme,
    upcomingSessions,
    assessment,
    completedSessionCount: completedCount?.value ?? 0,
  };
}

export async function getAuditLog(session: SessionPayload) {
  const condition = withCentreScope(
    session,
    eq(auditEntries.organisationId, session.organisationId),
    auditEntries.centreId,
  );

  if (session.activeRole !== "admin" && session.activeRole !== "centre_manager") {
    return [];
  }

  return db
    .select()
    .from(auditEntries)
    .where(condition)
    .orderBy(desc(auditEntries.createdAt))
    .limit(50);
}

export type CentreMemberRow = {
  id: string;
  name: string;
  email: string | null;
  status: string;
  centreId: string;
  centreName: string;
  goal: string | null;
  trainerName: string | null;
  sessionsRemaining: number | null;
  planName: string | null;
  planStatus: string | null;
  planEndsAt: Date | null;
  amountDue: number;
  attendance30d: number;
};

export async function getCentreMembers(session: SessionPayload): Promise<CentreMemberRow[]> {
  const memberScope = orgAndCentreScope(session, members.organisationId, members.centreId);

  const rows = await db
    .select({
      id: members.id,
      name: members.name,
      email: members.email,
      status: members.status,
      goal: members.goal,
      centreId: members.centreId,
      centreName: centres.name,
    })
    .from(members)
    .innerJoin(centres, eq(members.centreId, centres.id))
    .where(memberScope)
    .orderBy(members.name);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const result: CentreMemberRow[] = [];
  for (const m of rows) {
    const [rel] = await db
      .select({ trainerName: users.name })
      .from(coachingRelationships)
      .innerJoin(users, eq(coachingRelationships.trainerId, users.id))
      .where(and(eq(coachingRelationships.memberId, m.id), eq(coachingRelationships.active, true)))
      .limit(1);

    const [plan] = await db
      .select({
        sessionsRemaining: memberPlans.sessionsRemaining,
        planName: memberPlans.planName,
        planStatus: memberPlans.status,
        planEndsAt: memberPlans.endsAt,
        amountDue: memberPlans.amountDue,
      })
      .from(memberPlans)
      .where(eq(memberPlans.memberId, m.id))
      .orderBy(desc(memberPlans.createdAt))
      .limit(1);

    const [attendance] = await db
      .select({ value: count() })
      .from(attendanceRecords)
      .where(
        and(eq(attendanceRecords.memberId, m.id), gte(attendanceRecords.checkedInAt, thirtyDaysAgo)),
      );

    result.push({
      ...m,
      trainerName: rel?.trainerName ?? null,
      sessionsRemaining: plan?.sessionsRemaining ?? null,
      planName: plan?.planName ?? null,
      planStatus: plan?.planStatus ?? null,
      planEndsAt: plan?.planEndsAt ?? null,
      amountDue: plan?.amountDue ?? 0,
      attendance30d: attendance?.value ?? 0,
    });
  }

  return result;
}

export async function getOrganisationSettings(session: SessionPayload) {
  const centreRows = await db
    .select()
    .from(centres)
    .where(eq(centres.organisationId, session.organisationId))
    .orderBy(centres.name);

  const assignments = await db
    .select({
      id: roleAssignments.id,
      role: roleAssignments.role,
      centreId: roleAssignments.centreId,
      userName: users.name,
      userEmail: users.email,
    })
    .from(roleAssignments)
    .innerJoin(users, eq(roleAssignments.userId, users.id))
    .where(eq(roleAssignments.organisationId, session.organisationId));

  return { centres: centreRows, assignments };
}

export async function getMarketplaceTrainers(organisationId: string) {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      centreId: roleAssignments.centreId,
      centreName: centres.name,
      bio: trainerProfiles.bio,
      specialties: trainerProfiles.specialties,
      sessionsPerWeek: trainerProfiles.sessionsPerWeek,
      marketplaceVisible: trainerProfiles.marketplaceVisible,
    })
    .from(roleAssignments)
    .innerJoin(users, eq(roleAssignments.userId, users.id))
    .innerJoin(centres, eq(roleAssignments.centreId, centres.id))
    .leftJoin(trainerProfiles, eq(trainerProfiles.userId, users.id))
    .where(
      and(eq(roleAssignments.organisationId, organisationId), eq(roleAssignments.role, "trainer")),
    );

  const defaultBio =
    "LMNT-certified coach focused on assessment-led programming and accountable progress.";

  return rows
    .filter((r): r is typeof r & { centreId: string } => r.centreId != null)
    .filter((r) => r.marketplaceVisible !== false)
    .map((r) => ({
      id: r.id,
      name: r.name,
      centreId: r.centreId,
      centreName: r.centreName,
      specialties: r.specialties?.length ? r.specialties : ["General fitness", "PT"],
      bio: r.bio ?? defaultBio,
      sessionsPerWeek: r.sessionsPerWeek ?? "3–5 sessions / week",
    }));
}

export async function getMemberships(session: SessionPayload) {
  const planScope = orgAndCentreScope(session, memberPlans.organisationId, memberPlans.centreId);
  const plans = await db
    .select({
      id: memberPlans.id,
      planName: memberPlans.planName,
      status: memberPlans.status,
      totalSessions: memberPlans.totalSessions,
      sessionsRemaining: memberPlans.sessionsRemaining,
      packageValue: memberPlans.packageValue,
      amountDue: memberPlans.amountDue,
      trainerShareBps: memberPlans.trainerShareBps,
      startsAt: memberPlans.startsAt,
      endsAt: memberPlans.endsAt,
      memberName: members.name,
      memberId: members.id,
      centreName: centres.name,
    })
    .from(memberPlans)
    .innerJoin(members, eq(memberPlans.memberId, members.id))
    .innerJoin(centres, eq(memberPlans.centreId, centres.id))
    .where(planScope)
    .orderBy(desc(memberPlans.createdAt));

  const memberIds = [...new Set(plans.map((plan) => plan.memberId))];
  const trainerRows =
    memberIds.length === 0
      ? []
      : await db
          .select({
            memberId: coachingRelationships.memberId,
            trainerId: coachingRelationships.trainerId,
            trainerName: users.name,
          })
          .from(coachingRelationships)
          .innerJoin(users, eq(coachingRelationships.trainerId, users.id))
          .where(and(inArray(coachingRelationships.memberId, memberIds), eq(coachingRelationships.active, true)));

  const trainerByMember = new Map<string, { trainerId: string; trainerName: string }>();
  for (const row of trainerRows) {
    if (!trainerByMember.has(row.memberId)) {
      trainerByMember.set(row.memberId, { trainerId: row.trainerId, trainerName: row.trainerName });
    }
  }

  return plans.map((plan) => {
    const trainer = trainerByMember.get(plan.memberId);
    return {
      ...plan,
      trainerId: trainer?.trainerId ?? null,
      trainerName: trainer?.trainerName ?? null,
      trainerRevenue: trainerCollectedInr(plan.packageValue, plan.amountDue, plan.trainerShareBps),
    };
  });
}

export async function getOrgPayments(session: SessionPayload) {
  const paymentScope = orgAndCentreScope(session, paymentRecords.organisationId, paymentRecords.centreId);
  return db
    .select({
      id: paymentRecords.id,
      amountInr: paymentRecords.amountInr,
      method: paymentRecords.method,
      notes: paymentRecords.notes,
      createdAt: paymentRecords.createdAt,
      memberName: members.name,
      memberId: members.id,
      centreName: centres.name,
      trainerShareBps: memberPlans.trainerShareBps,
      planName: memberPlans.planName,
    })
    .from(paymentRecords)
    .innerJoin(members, eq(paymentRecords.memberId, members.id))
    .innerJoin(centres, eq(paymentRecords.centreId, centres.id))
    .leftJoin(memberPlans, eq(paymentRecords.planId, memberPlans.id))
    .where(paymentScope)
    .orderBy(desc(paymentRecords.createdAt));
}

export async function getAdminSchedule(session: SessionPayload) {
  const sessionScope = orgAndCentreScope(session, sessions.organisationId, sessions.centreId);
  const today = startOfDay();
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 14);

  return db
    .select({
      id: sessions.id,
      scheduledAt: sessions.scheduledAt,
      status: sessions.status,
      memberName: members.name,
      trainerName: users.name,
      centreName: centres.name,
      programmeTitle: programmes.title,
    })
    .from(sessions)
    .innerJoin(members, eq(sessions.memberId, members.id))
    .innerJoin(centres, eq(sessions.centreId, centres.id))
    .leftJoin(users, eq(sessions.trainerId, users.id))
    .leftJoin(programmes, eq(sessions.programmeId, programmes.id))
    .where(and(sessionScope, gte(sessions.scheduledAt, today), lte(sessions.scheduledAt, horizon)))
    .orderBy(sessions.scheduledAt)
    .limit(80);
}

export async function getAdminDashboard(session: SessionPayload) {
  const sessionScope = orgAndCentreScope(session, sessions.organisationId, sessions.centreId);
  const planScope = orgAndCentreScope(session, memberPlans.organisationId, memberPlans.centreId);

  const today = startOfDay();
  const tomorrow = new Date(today.getTime() + 86400000);
  const expiryHorizon = new Date(today.getTime() + 14 * 86400000);

  const { getAdminMetricsSnapshot } = await import("@/lib/metrics");
  const kpi = await getAdminMetricsSnapshot(session);

  const assetRows = await getAssets(session);
  const now = new Date();
  const assetOverview = {
    total: assetRows.length,
    inUse: assetRows.filter((a) => assetUiStatus(a) === "in_use").length,
    available: assetRows.filter((a) => assetUiStatus(a) === "available").length,
    maintenance: assetRows.filter((a) => assetUiStatus(a) === "maintenance").length,
    damaged: assetRows.filter((a) => assetUiStatus(a) === "damaged").length,
    needsAttention: assetRows.filter((a) => assetNeedsAttention(a, now)).length,
  };

  const recentActivity = await getAuditLog(session);

  const expiryAlerts = await db
    .select({
      id: memberPlans.id,
      planName: memberPlans.planName,
      endsAt: memberPlans.endsAt,
      memberName: members.name,
      sessionsRemaining: memberPlans.sessionsRemaining,
    })
    .from(memberPlans)
    .innerJoin(members, eq(memberPlans.memberId, members.id))
    .where(
      and(planScope, eq(memberPlans.status, "active"), lte(memberPlans.endsAt, expiryHorizon), gte(memberPlans.endsAt, today)),
    )
    .orderBy(memberPlans.endsAt)
    .limit(8);

  const todaySessionRows = await db
    .select({
      id: sessions.id,
      scheduledAt: sessions.scheduledAt,
      status: sessions.status,
      memberName: members.name,
    })
    .from(sessions)
    .innerJoin(members, eq(sessions.memberId, members.id))
    .where(
      and(
        sessionScope,
        gte(sessions.scheduledAt, today),
        lte(sessions.scheduledAt, tomorrow),
        sql`${sessions.status} <> 'cancelled'`,
      ),
    )
    .orderBy(sessions.scheduledAt)
    .limit(8);

  return {
    members: kpi.members,
    activeTrainers: kpi.activeTrainers,
    trainers: kpi.activeTrainers,
    todaySessions: kpi.todaySessions,
    sessionsToday: kpi.todaySessions,
    monthlyRevenue: kpi.monthlyRevenue,
    retentionRate: kpi.retentionRate,
    adherenceRate: kpi.adherenceRate,
    assetOverview,
    assets: assetOverview,
    recentActivity: recentActivity.slice(0, 8),
    expiryAlerts,
    todaySessionRows,
  };
}
