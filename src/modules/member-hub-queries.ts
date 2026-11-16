import { and, count, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import {
  assessments,
  coachingRelationships,
  gymMemberships,
  memberCoachQuestions,
  memberDailyLogs,
  memberPlans,
  memberVacations,
  memberWearables,
  members,
  programmes,
  sessions,
  users,
  workRequests,
} from "@/db/schema";
import type { CapabilityProfile } from "@/lib/capability-score";
import { gymMembershipDisplayStatus } from "@/lib/gym-membership";
import { getClientLinkedMember } from "@/lib/assert-client-member";
import type { SessionPayload } from "@/lib/session";
import { getMemberTimeline } from "@/modules/member-timeline";
import { getMemberProgressSnapshots } from "@/modules/trainer-queries";
import { getPartnerCatalogue } from "@/modules/community-queries";

export async function getMemberHubView(session: SessionPayload) {
  const member = await getClientLinkedMember(session);
  if (!member) return null;

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  const [
    programme,
    assessment,
    plan,
    gymMembership,
    trainerRel,
    completedCount,
    weekCompleted,
    upcomingSessions,
    timeline,
    snapshots,
    dailyLogs,
    vacations,
    wearables,
    questions,
    facilityTickets,
    offers,
  ] = await Promise.all([
    db
      .select()
      .from(programmes)
      .where(and(eq(programmes.memberId, member.id), eq(programmes.status, "active")))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select()
      .from(assessments)
      .where(eq(assessments.memberId, member.id))
      .orderBy(desc(assessments.createdAt))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select()
      .from(memberPlans)
      .where(and(eq(memberPlans.memberId, member.id), eq(memberPlans.status, "active")))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select()
      .from(gymMemberships)
      .where(eq(gymMemberships.memberId, member.id))
      .orderBy(desc(gymMemberships.createdAt))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select({ trainerId: coachingRelationships.trainerId, trainerName: users.name })
      .from(coachingRelationships)
      .innerJoin(users, eq(coachingRelationships.trainerId, users.id))
      .where(and(eq(coachingRelationships.memberId, member.id), eq(coachingRelationships.active, true)))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select({ value: count() })
      .from(sessions)
      .where(and(eq(sessions.memberId, member.id), eq(sessions.status, "completed")))
      .then((r) => r[0]?.value ?? 0),
    db
      .select({ value: count() })
      .from(sessions)
      .where(
        and(
          eq(sessions.memberId, member.id),
          eq(sessions.status, "completed"),
          gte(sessions.completedAt, weekStart),
        ),
      )
      .then((r) => r[0]?.value ?? 0),
    db
      .select()
      .from(sessions)
      .where(and(eq(sessions.memberId, member.id), eq(sessions.status, "scheduled")))
      .orderBy(sessions.scheduledAt)
      .limit(5),
    getMemberTimeline(session, member.id),
    getMemberProgressSnapshots(member.id),
    db
      .select()
      .from(memberDailyLogs)
      .where(eq(memberDailyLogs.memberId, member.id))
      .orderBy(desc(memberDailyLogs.logDate))
      .limit(14),
    db
      .select()
      .from(memberVacations)
      .where(and(eq(memberVacations.memberId, member.id), gte(memberVacations.endsAt, now.toISOString().slice(0, 10))))
      .orderBy(memberVacations.startsAt),
    db
      .select()
      .from(memberWearables)
      .where(eq(memberWearables.memberId, member.id))
      .orderBy(desc(memberWearables.recordedAt))
      .limit(14),
    db
      .select()
      .from(memberCoachQuestions)
      .where(eq(memberCoachQuestions.memberId, member.id))
      .orderBy(desc(memberCoachQuestions.createdAt))
      .limit(10),
    db
      .select()
      .from(workRequests)
      .where(
        and(eq(workRequests.requestedBy, session.userId), eq(workRequests.organisationId, session.organisationId)),
      )
      .orderBy(desc(workRequests.createdAt))
      .limit(5),
    getPartnerCatalogue(session).catch(() => []),
  ]);

  const targetSessions =
    member.goalTargetSessions ??
    plan?.totalSessions ??
    (assessment?.capabilityProfile as CapabilityProfile | null)?.daysPerWeek ??
    12;
  const achievedSessions = completedCount;
  const goalPct = targetSessions > 0 ? Math.min(100, Math.round((achievedSessions / targetSessions) * 100)) : 0;

  const capability = assessment?.capabilityProfile as CapabilityProfile | null;
  const immediateGoal = capability?.immediateGoal ?? member.goal ?? "Set a goal with your coach";
  const longTermGoal = capability?.longTermGoal ?? plan?.planName ?? "—";

  const weekCalories =
    dailyLogs.length > 0
      ? Math.round(
          dailyLogs
            .filter((l) => l.calories != null)
            .slice(0, 7)
            .reduce((s, l) => s + (l.calories ?? 0), 0) / Math.max(1, dailyLogs.slice(0, 7).length),
        )
      : null;

  const latestWearable = wearables[0] ?? null;

  const notifications: { id: string; title: string; detail: string; href?: string }[] = [];
  if (upcomingSessions[0]) {
    notifications.push({
      id: "next-session",
      title: "Upcoming session",
      detail: new Date(upcomingSessions[0].scheduledAt).toLocaleString(),
      href: "/app/schedule",
    });
  }
  if (assessment?.scheduledAt && assessment.status !== "completed") {
    notifications.push({
      id: "assessment",
      title: "Assessment booked",
      detail: new Date(assessment.scheduledAt).toLocaleString(),
    });
  }
  if (gymMembership) {
    const label = gymMembershipDisplayStatus(gymMembership.status, gymMembership.endsAt, now);
    if (label === "expiring soon") {
      notifications.push({
        id: "gym",
        title: "Gym pack expiring soon",
        detail: `Ends ${new Date(gymMembership.endsAt).toLocaleDateString()}`,
      });
    }
  }
  for (const offer of offers.flatMap((p) => p.offers).slice(0, 2)) {
    notifications.push({
      id: `offer-${offer.id}`,
      title: "Partner offer",
      detail: offer.title,
      href: "/app/community",
    });
  }

  const weightChart = [...snapshots]
    .reverse()
    .filter((s) => s.weight != null)
    .map((s) => ({
      date: new Date(s.recordedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      weight: s.weight!,
    }));

  const sessionChart = await db
    .select({ scheduledAt: sessions.scheduledAt, status: sessions.status, rpe: sessions.rpe })
    .from(sessions)
    .where(eq(sessions.memberId, member.id))
    .orderBy(desc(sessions.scheduledAt))
    .limit(20);

  const rpeChart = sessionChart
    .filter((s) => s.status === "completed" && s.rpe)
    .reverse()
    .slice(-12)
    .map((s) => ({
      date: new Date(s.scheduledAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      rpe: s.rpe!,
    }));

  const programWeeks = programme?.content?.weeks?.length ?? 0;

  return {
    member,
    programme,
    assessment,
    plan,
    gymMembership,
    trainer: trainerRel,
    goal: {
      immediate: immediateGoal,
      longTerm: longTermGoal,
      targetSessions,
      achievedSessions,
      goalPct,
    },
    weeklyReview: {
      sessionsCompleted: weekCompleted,
      avgCalories: weekCalories,
      latestRecovery: latestWearable?.recovery ?? null,
      latestSleep: latestWearable?.sleepHours ?? null,
      summary: `This week: ${weekCompleted} sessions completed${
        weekCalories ? `, ~${weekCalories} kcal/day logged` : ""
      }${latestWearable?.recovery != null ? `, recovery ${latestWearable.recovery}%` : ""}.`,
    },
    upcomingSessions,
    timeline: timeline.slice(0, 12),
    dailyLogs,
    vacations,
    wearables,
    questions,
    facilityTickets,
    offers: offers.flatMap((p) => p.offers.map((o) => ({ ...o, partnerName: p.name }))).slice(0, 6),
    notifications,
    charts: { weight: weightChart, rpe: rpeChart },
    programWeeks,
    capabilityScore: assessment?.capabilityScore ?? null,
  };
}