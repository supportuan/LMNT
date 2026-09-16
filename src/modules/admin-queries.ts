import { and, count, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  coachingRelationships,
  memberPlans,
  organisations,
  roleAssignments,
  sessions,
  trainerProfiles,
  users,
} from "@/db/schema";
import type { SessionPayload } from "@/lib/session";
import { scopedCentreIds } from "@/lib/branch-scope";
import { trainerCollectedInr } from "@/lib/trainer-share";

export async function getOrgProfile(session: SessionPayload) {
  const [org] = await db
    .select()
    .from(organisations)
    .where(eq(organisations.id, session.organisationId))
    .limit(1);
  return org ?? null;
}

export async function getScheduleTrainers(session: SessionPayload) {
  let condition = and(
    eq(roleAssignments.organisationId, session.organisationId),
    eq(roleAssignments.role, "trainer"),
  )!;
  const ids = scopedCentreIds(session);
  if (ids?.length) {
    condition = and(condition, inArray(roleAssignments.centreId, ids))!;
  }

  return db
    .select({
      id: users.id,
      name: users.name,
      centreId: roleAssignments.centreId,
    })
    .from(roleAssignments)
    .innerJoin(users, eq(roleAssignments.userId, users.id))
    .where(condition)
    .orderBy(users.name);
}

export async function getAssetTrainers(session: SessionPayload) {
  return getScheduleTrainers(session);
}

export type TrainerDeskStats = {
  clients: number;
  sessions30d: number;
  completed30d: number;
  availability: string;
  performance: number;
  revenue: number;
};

export async function getTrainerDesk(session: SessionPayload, trainerIds: string[]) {
  if (trainerIds.length === 0) return new Map<string, TrainerDeskStats>();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const stats = new Map<string, TrainerDeskStats>();

  const planRows = await db
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

  for (const trainerId of trainerIds) {
    const [clients] = await db
      .select({ value: count() })
      .from(coachingRelationships)
      .where(and(eq(coachingRelationships.trainerId, trainerId), eq(coachingRelationships.active, true)));

    const [sessionCount] = await db
      .select({ value: count() })
      .from(sessions)
      .where(
        and(
          eq(sessions.trainerId, trainerId),
          eq(sessions.organisationId, session.organisationId),
          gte(sessions.scheduledAt, thirtyDaysAgo),
          sql`${sessions.status} <> 'cancelled'`,
        ),
      );

    const [completed] = await db
      .select({ value: count() })
      .from(sessions)
      .where(
        and(
          eq(sessions.trainerId, trainerId),
          eq(sessions.organisationId, session.organisationId),
          gte(sessions.scheduledAt, thirtyDaysAgo),
          eq(sessions.status, "completed"),
        ),
      );

    const [profile] = await db
      .select({ sessionsPerWeek: trainerProfiles.sessionsPerWeek })
      .from(trainerProfiles)
      .where(eq(trainerProfiles.userId, trainerId))
      .limit(1);

    const total = sessionCount.value;
    const done = completed.value;
    stats.set(trainerId, {
      clients: clients.value,
      sessions30d: total,
      completed30d: done,
      availability: profile?.sessionsPerWeek ?? "Schedule not set",
      performance: total > 0 ? Math.round((done / total) * 100) : 0,
      revenue: revenueByTrainer.get(trainerId) ?? 0,
    });
  }

  return stats;
}
