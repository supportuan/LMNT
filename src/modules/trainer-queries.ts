import { and, count, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  assessments,
  attendanceRecords,
  clientCheckIns,
  coachNotes,
  coachingRelationships,
  leads,
  memberPlans,
  members,
  messages,
  nutritionPlans,
  onboardingAssignments,
  programmes,
  progressSnapshots,
  scheduleBlocks,
  sessionExerciseLogs,
  sessionFeedback,
  sessions,
  tasks,
  trainerSettings,
  users,
} from "@/db/schema";
import { orgAndCentreScope } from "@/lib/branch-scope";
import type { SessionPayload } from "@/lib/session";
import { applyShareBps, trainerCollectedInr } from "@/lib/trainer-share";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

async function trainerMemberIds(trainerId: string) {
  const rels = await db
    .select({ memberId: coachingRelationships.memberId })
    .from(coachingRelationships)
    .where(and(eq(coachingRelationships.trainerId, trainerId), eq(coachingRelationships.active, true)));
  return rels.map((r) => r.memberId);
}

export async function getTrainerDashboard(session: SessionPayload) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const memberIds = await trainerMemberIds(session.userId);

  const [activeClients] = await db
    .select({ value: count() })
    .from(coachingRelationships)
    .where(
      and(eq(coachingRelationships.trainerId, session.userId), eq(coachingRelationships.active, true)),
    );

  const todaySessions = await db
    .select({
      id: sessions.id,
      scheduledAt: sessions.scheduledAt,
      status: sessions.status,
      memberId: sessions.memberId,
      memberName: members.name,
      programmeTitle: programmes.title,
      painFlag: sessions.painFlag,
    })
    .from(sessions)
    .innerJoin(members, eq(sessions.memberId, members.id))
    .leftJoin(programmes, eq(sessions.programmeId, programmes.id))
    .where(
      and(
        eq(sessions.trainerId, session.userId),
        gte(sessions.scheduledAt, todayStart),
        lt(sessions.scheduledAt, todayEnd),
      ),
    )
    .orderBy(sessions.scheduledAt);

  const upcomingSessions = await db
    .select({
      id: sessions.id,
      scheduledAt: sessions.scheduledAt,
      status: sessions.status,
      memberId: sessions.memberId,
      memberName: members.name,
      programmeTitle: programmes.title,
    })
    .from(sessions)
    .innerJoin(members, eq(sessions.memberId, members.id))
    .leftJoin(programmes, eq(sessions.programmeId, programmes.id))
    .where(and(eq(sessions.trainerId, session.userId), gte(sessions.scheduledAt, now)))
    .orderBy(sessions.scheduledAt)
    .limit(5);

  const attention: { title: string; detail: string; tone: "warning" | "danger" | "info"; href?: string }[] = [];

  if (memberIds.length > 0) {
    const painSessions = await db
      .select({ memberName: members.name, id: sessions.id })
      .from(sessions)
      .innerJoin(members, eq(sessions.memberId, members.id))
      .where(and(eq(sessions.trainerId, session.userId), eq(sessions.painFlag, true)))
      .orderBy(desc(sessions.scheduledAt))
      .limit(3);

    painSessions.forEach((s) => {
      attention.push({
        title: "Pain / discomfort reported",
        detail: `${s.memberName} — review before next session`,
        tone: "danger",
        href: `/app/sessions/${s.id}`,
      });
    });

    const missed = await db
      .select({ memberName: members.name, id: sessions.id })
      .from(sessions)
      .innerJoin(members, eq(sessions.memberId, members.id))
      .where(
        and(
          eq(sessions.trainerId, session.userId),
          eq(sessions.status, "scheduled"),
          lt(sessions.scheduledAt, now),
        ),
      )
      .limit(3);

    missed.forEach((s) => {
      attention.push({
        title: "Missed session",
        detail: `${s.memberName} — follow up required`,
        tone: "warning",
        href: `/app/sessions/${s.id}`,
      });
    });
  }

  const [leadFollowUps] = await db
    .select({ value: count() })
    .from(leads)
    .where(and(eq(leads.ownerId, session.userId), eq(leads.stage, "consultation")));

  const [clientFollowUps] = await db
    .select({ value: count() })
    .from(coachingRelationships)
    .where(
      and(
        eq(coachingRelationships.trainerId, session.userId),
        eq(coachingRelationships.active, true),
        eq(coachingRelationships.needsFollowUp, true),
      ),
    );

  const openTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      dueAt: tasks.dueAt,
      triggerEvent: tasks.triggerEvent,
      status: tasks.status,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.ownerId, session.userId),
        eq(tasks.organisationId, session.organisationId),
        inArray(tasks.status, ["open", "in_progress"]),
      ),
    )
    .orderBy(tasks.dueAt)
    .limit(10);

  openTasks.forEach((task) => {
    const overdue = task.dueAt != null && task.dueAt < now;
    attention.push({
      title: task.title,
      detail: task.dueAt
        ? `${overdue ? "Overdue · " : ""}Due ${task.dueAt.toLocaleString()}`
        : task.triggerEvent ?? "Open task",
      tone: overdue ? "warning" : "info",
      href: "/app/tasks",
    });
  });

  const weekStart = startOfDay(now);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weekSessions = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.trainerId, session.userId),
        gte(sessions.scheduledAt, weekStart),
        lt(sessions.scheduledAt, weekEnd),
        eq(sessions.status, "scheduled"),
      ),
    );

  const settings = await getTrainerSettings(session);

  const activePlans = await db
    .select({ amountDue: memberPlans.amountDue })
    .from(memberPlans)
    .innerJoin(members, eq(memberPlans.memberId, members.id))
    .innerJoin(
      coachingRelationships,
      and(
        eq(coachingRelationships.memberId, members.id),
        eq(coachingRelationships.trainerId, session.userId),
        eq(coachingRelationships.active, true),
      ),
    )
    .where(and(eq(memberPlans.status, "active"), eq(members.organisationId, session.organisationId)));

  const totalDue = activePlans.reduce((sum, p) => sum + (p.amountDue ?? 0), 0);

  const lifeBlocks = await db
    .select({ id: scheduleBlocks.id })
    .from(scheduleBlocks)
    .where(
      and(
        eq(scheduleBlocks.trainerId, session.userId),
        eq(scheduleBlocks.blockType, "life"),
      ),
    )
    .limit(1);

  const alerts: { message: string; tone: "warning" | "danger" | "info" }[] = [];
  if (todaySessions.length > settings.maxConsecutiveSessions) {
    alerts.push({
      message: `Heavy day: ${todaySessions.length} sessions. Consider a recovery buffer.`,
      tone: "warning",
    });
  }
  if (lifeBlocks.length === 0) {
    alerts.push({
      message: "Your own training/recovery is not protected on the timetable.",
      tone: "warning",
    });
  }
  if (totalDue > 0) {
    alerts.push({
      message: `₹${totalDue.toLocaleString("en-IN")} in client payments need attention.`,
      tone: "info",
    });
  }

  let energyScore = 85;
  if (todaySessions.length > settings.maxConsecutiveSessions) energyScore = 55;
  else if (lifeBlocks.length === 0) energyScore -= 10;
  if (clientFollowUps.value > 0) energyScore -= 5;

  const nextSession =
    todaySessions.find((s) => s.status === "scheduled" || s.status === "in_progress") ??
    (upcomingSessions[0]
      ? {
          id: upcomingSessions[0].id,
          memberName: upcomingSessions[0].memberName,
          memberId: upcomingSessions[0].memberId,
          scheduledAt: upcomingSessions[0].scheduledAt,
        }
      : null);

  return {
    greeting: session.name.split(" ")[0],
    stats: {
      todaySessions: todaySessions.length,
      weekSessions: weekSessions.length,
      activeClients: activeClients.value,
      followUps: leadFollowUps.value + clientFollowUps.value,
      pendingTasks: openTasks.length + leadFollowUps.value + clientFollowUps.value,
      programReviews: 0,
      coachingLoadHours: todaySessions.length,
    },
    nextClient: nextSession
      ? {
          name: nextSession.memberName,
          time: new Date(nextSession.scheduledAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          sessionId: nextSession.id,
          memberId: nextSession.memberId,
        }
      : null,
    energyScore,
    alerts,
    settings,
    todaySessions: todaySessions.map((s) => ({
      ...s,
      scheduledAt: s.scheduledAt.toISOString(),
    })),
    upcomingSessions: upcomingSessions.map((s) => ({
      ...s,
      scheduledAt: s.scheduledAt.toISOString(),
    })),
    attention,
    openTasks: openTasks.map((t) => ({
      ...t,
      dueAt: t.dueAt?.toISOString() ?? null,
    })),
  };
}

export async function getTrainerOpenTasks(session: SessionPayload) {
  const rows = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.ownerId, session.userId),
        eq(tasks.organisationId, session.organisationId),
        inArray(tasks.status, ["open", "in_progress"]),
      ),
    )
    .orderBy(tasks.dueAt)
    .limit(100);

  return rows.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    dueAt: t.dueAt?.toISOString() ?? null,
    triggerEvent: t.triggerEvent,
    createdAt: t.createdAt.toISOString(),
  }));
}

export type TrainerClientCard = {
  id: string;
  name: string;
  goal: string | null;
  email: string | null;
  status: string;
  nextSession: string | null;
  lastSession: string | null;
  programmeTitle: string | null;
  programmeStatus: string | null;
  progressStatus: "on_track" | "needs_review" | "at_risk";
  sessionsRemaining: number | null;
  amountDue: number | null;
  packageValue: number | null;
  needsFollowUp: boolean;
  programReviewDue: boolean;
  noSession14d: boolean;
};

export async function getTrainerClientsEnriched(session: SessionPayload): Promise<TrainerClientCard[]> {
  const clients = await db
    .select({
      id: members.id,
      name: members.name,
      goal: members.goal,
      email: members.email,
      status: members.status,
      needsFollowUp: coachingRelationships.needsFollowUp,
    })
    .from(members)
    .innerJoin(
      coachingRelationships,
      and(
        eq(coachingRelationships.memberId, members.id),
        eq(coachingRelationships.trainerId, session.userId),
        eq(coachingRelationships.active, true),
      ),
    );

  const now = new Date();
  const result: TrainerClientCard[] = [];

  for (const c of clients) {
    const [next] = await db
      .select({ scheduledAt: sessions.scheduledAt })
      .from(sessions)
      .where(
        and(eq(sessions.memberId, c.id), eq(sessions.trainerId, session.userId), gte(sessions.scheduledAt, now)),
      )
      .orderBy(sessions.scheduledAt)
      .limit(1);

    const [last] = await db
      .select({ scheduledAt: sessions.scheduledAt })
      .from(sessions)
      .where(and(eq(sessions.memberId, c.id), eq(sessions.status, "completed")))
      .orderBy(desc(sessions.scheduledAt))
      .limit(1);

    const [prog] = await db
      .select({ title: programmes.title, status: programmes.status })
      .from(programmes)
      .where(and(eq(programmes.memberId, c.id), eq(programmes.status, "active")))
      .limit(1);

    const [pain] = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.memberId, c.id), eq(sessions.painFlag, true)))
      .limit(1);

    const [plan] = await db
      .select({
        sessionsRemaining: memberPlans.sessionsRemaining,
        amountDue: memberPlans.amountDue,
        packageValue: memberPlans.packageValue,
      })
      .from(memberPlans)
      .where(and(eq(memberPlans.memberId, c.id), eq(memberPlans.status, "active")))
      .limit(1);

    const [assessment] = await db
      .select({ completedAt: assessments.completedAt, status: assessments.status })
      .from(assessments)
      .where(eq(assessments.memberId, c.id))
      .orderBy(desc(assessments.createdAt))
      .limit(1);

    let progressStatus: TrainerClientCard["progressStatus"] = "on_track";
    const noSession14d = !last || now.getTime() - last.scheduledAt.getTime() > 14 * 86400000;

    const [completedRow] = await db
      .select({ value: count() })
      .from(sessions)
      .where(
        and(eq(sessions.memberId, c.id), eq(sessions.trainerId, session.userId), eq(sessions.status, "completed")),
      );

    const programReviewDue =
      (completedRow?.value ?? 0) >= 3 &&
      (!assessment || assessment.status !== "completed");

    if (pain) progressStatus = "at_risk";
    else if (noSession14d) progressStatus = "needs_review";

    result.push({
      ...c,
      nextSession: next?.scheduledAt.toISOString() ?? null,
      lastSession: last?.scheduledAt.toISOString() ?? null,
      programmeTitle: prog?.title ?? null,
      programmeStatus: prog?.status ?? null,
      progressStatus,
      sessionsRemaining: plan?.sessionsRemaining ?? null,
      amountDue: plan?.amountDue ?? null,
      packageValue: plan?.packageValue ?? null,
      needsFollowUp: c.needsFollowUp,
      programReviewDue,
      noSession14d,
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getClientWorkspace(session: SessionPayload, memberId: string) {
  const [member] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  if (!member) return null;

  const [activeProgramme] = await db
    .select()
    .from(programmes)
    .where(and(eq(programmes.memberId, memberId), eq(programmes.status, "active")))
    .limit(1);

  const [latestProgramme] = await db
    .select()
    .from(programmes)
    .where(eq(programmes.memberId, memberId))
    .orderBy(desc(programmes.createdAt))
    .limit(1);

  const [latestAssessment] = await db
    .select()
    .from(assessments)
    .where(eq(assessments.memberId, memberId))
    .orderBy(desc(assessments.createdAt))
    .limit(1);

  const sessionFilter =
    session.activeRole === "trainer"
      ? and(eq(sessions.memberId, memberId), eq(sessions.trainerId, session.userId))
      : eq(sessions.memberId, memberId);

  const memberSessions = await db
    .select()
    .from(sessions)
    .where(sessionFilter)
    .orderBy(desc(sessions.scheduledAt))
    .limit(20);

  const completedCount = memberSessions.filter((s) => s.status === "completed").length;

  const [plan] = await db
    .select()
    .from(memberPlans)
    .where(and(eq(memberPlans.memberId, memberId), eq(memberPlans.status, "active")))
    .limit(1);

  const [onboarding] = await db
    .select()
    .from(onboardingAssignments)
    .where(eq(onboardingAssignments.memberId, memberId))
    .orderBy(desc(onboardingAssignments.createdAt))
    .limit(1);

  const now = new Date();
  const nextSession = memberSessions.find((s) => s.scheduledAt >= now && s.status !== "cancelled");

  const coachAttention: string[] = [];
  if (memberSessions.some((s) => s.painFlag)) {
    coachAttention.push("Client reported discomfort in a recent session.");
  }
  if (completedCount >= 3 && latestAssessment?.status !== "completed") {
    coachAttention.push("Program review recommended — complete or update assessment.");
  }
  if (plan && plan.sessionsRemaining <= 2) {
    coachAttention.push(`Package renewal due — ${plan.sessionsRemaining} sessions remaining.`);
  }
  if (plan && plan.amountDue > 0) {
    coachAttention.push(`₹${plan.amountDue.toLocaleString("en-IN")} outstanding on package.`);
  }
  const lastCompleted = memberSessions.find((s) => s.status === "completed");
  if (lastCompleted && now.getTime() - lastCompleted.scheduledAt.getTime() > 14 * 86400000) {
    coachAttention.push("No session completed in 14+ days — check in with client.");
  }
  if (coachAttention.length === 0) {
    coachAttention.push("Client is progressing well.");
  }

  return {
    member,
    activeProgramme,
    latestProgramme,
    latestAssessment,
    sessions: memberSessions,
    completedCount,
    plan,
    onboarding,
    nextSession,
    coachAttention,
  };
}

export async function getTrainerLeads(session: SessionPayload) {
  return db
    .select()
    .from(leads)
    .where(and(eq(leads.organisationId, session.organisationId), eq(leads.ownerId, session.userId)))
    .orderBy(desc(leads.updatedAt));
}

export async function getTrainerPrograms(session: SessionPayload) {
  const memberIds = await trainerMemberIds(session.userId);
  if (memberIds.length === 0) return [];

  return db
    .select({
      id: programmes.id,
      title: programmes.title,
      status: programmes.status,
      memberName: members.name,
      memberId: programmes.memberId,
      startsAt: programmes.startsAt,
    })
    .from(programmes)
    .innerJoin(members, eq(programmes.memberId, members.id))
    .where(inArray(programmes.memberId, memberIds))
    .orderBy(desc(programmes.createdAt));
}

export async function getTrainerSessionsList(session: SessionPayload, memberId?: string) {
  const isOrgViewer = session.activeRole === "admin" || session.activeRole === "centre_manager";
  const scope = isOrgViewer
    ? orgAndCentreScope(session, sessions.organisationId, sessions.centreId)
    : eq(sessions.trainerId, session.userId);
  const condition = memberId ? and(scope, eq(sessions.memberId, memberId))! : scope;

  return db
    .select({
      id: sessions.id,
      scheduledAt: sessions.scheduledAt,
      status: sessions.status,
      memberName: members.name,
      memberId: sessions.memberId,
      trainerName: users.name,
      programmeTitle: programmes.title,
      rpe: sessions.rpe,
      painFlag: sessions.painFlag,
    })
    .from(sessions)
    .innerJoin(members, eq(sessions.memberId, members.id))
    .leftJoin(programmes, eq(sessions.programmeId, programmes.id))
    .leftJoin(users, eq(sessions.trainerId, users.id))
    .where(condition)
    .orderBy(desc(sessions.scheduledAt))
    .limit(50);
}

export async function getSessionForCoaching(session: SessionPayload, sessionId: string) {
  const [row] = await db
    .select({
      session: sessions,
      memberName: members.name,
      memberGoal: members.goal,
      programmeTitle: programmes.title,
    })
    .from(sessions)
    .innerJoin(members, eq(sessions.memberId, members.id))
    .leftJoin(programmes, eq(sessions.programmeId, programmes.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!row) return null;
  if (session.activeRole === "trainer" && row.session.trainerId !== session.userId) return null;

  const [feedback] = await db
    .select()
    .from(sessionFeedback)
    .where(eq(sessionFeedback.sessionId, sessionId))
    .limit(1);

  const [programme] = row.session.programmeId
    ? await db
        .select()
        .from(programmes)
        .where(eq(programmes.id, row.session.programmeId))
        .limit(1)
    : [null];

  const exerciseLogs = await db
    .select()
    .from(sessionExerciseLogs)
    .where(eq(sessionExerciseLogs.sessionId, sessionId))
    .orderBy(sessionExerciseLogs.sortOrder);

  const defaultExercises =
    programme?.content?.weeks?.[0]?.days?.[0]?.exercises?.map((e) => ({
      exerciseName: e.name,
      movementPattern: e.pattern,
      targetPrescription: e.prescription,
    })) ?? [
      { exerciseName: "Squat pattern", movementPattern: "squat", targetPrescription: "3 × 8–10 @ RPE 7–8" },
      { exerciseName: "Hinge pattern", movementPattern: "hinge", targetPrescription: "3 × 8–10 @ RPE 7–8" },
      { exerciseName: "Push", movementPattern: "push", targetPrescription: "3 × 8–10 @ RPE 7–8" },
      { exerciseName: "Pull", movementPattern: "pull", targetPrescription: "3 × 8–10 @ RPE 7–8" },
      { exerciseName: "Core", movementPattern: "core", targetPrescription: "3 × 8–10 @ RPE 7–8" },
    ];

  const workoutOptions =
    programme?.content?.weeks?.flatMap((week) =>
      week.days.map((day) => ({
        key: day.key,
        label: `Week ${week.week} · ${day.label}`,
        exercises: day.exercises.map((e) => ({
          exerciseName: e.name,
          movementPattern: e.pattern,
          targetPrescription: e.prescription,
        })),
      })),
    ) ?? [{ key: "default", label: "Standard PT session", exercises: defaultExercises }];

  return { ...row, feedback, programme, exerciseLogs, defaultExercises, workoutOptions };
}

export async function getMemberNutrition(memberId: string) {
  const [plan] = await db
    .select()
    .from(nutritionPlans)
    .where(eq(nutritionPlans.memberId, memberId))
    .limit(1);
  return plan ?? null;
}

export async function getMemberNotes(memberId: string) {
  return db
    .select()
    .from(coachNotes)
    .where(eq(coachNotes.memberId, memberId))
    .orderBy(desc(coachNotes.updatedAt))
    .limit(20);
}

export async function getMemberMessages(memberId: string) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.memberId, memberId))
    .orderBy(desc(messages.createdAt))
    .limit(50);
}

export async function getMemberCheckIns(memberId: string) {
  return db
    .select()
    .from(clientCheckIns)
    .where(eq(clientCheckIns.memberId, memberId))
    .orderBy(desc(clientCheckIns.createdAt))
    .limit(10);
}

export async function getMemberProgressSnapshots(memberId: string) {
  return db
    .select()
    .from(progressSnapshots)
    .where(eq(progressSnapshots.memberId, memberId))
    .orderBy(desc(progressSnapshots.recordedAt))
    .limit(20);
}

export type TrainerSettingsData = {
  id: string;
  maxConsecutiveSessions: number;
  trainingDays: string | null;
  trainingTime: string | null;
  mealWindow: string | null;
  lifeNotes: string | null;
  top3: string[];
  nonNegotiables: { label: string; done: boolean }[];
  notifications: { sessionReminders: boolean; clientUpdates: boolean; emailDigest: boolean };
};

const DEFAULT_TOP3 = ["Deliver great sessions", "One career-building task", "Protect recovery time"];
const DEFAULT_NOTIFICATIONS = { sessionReminders: true, clientUpdates: true, emailDigest: false };

export async function getTrainerSettings(session: SessionPayload): Promise<TrainerSettingsData> {
  const [existing] = await db
    .select()
    .from(trainerSettings)
    .where(
      and(
        eq(trainerSettings.userId, session.userId),
        eq(trainerSettings.organisationId, session.organisationId),
      ),
    )
    .limit(1);

  if (existing) {
    return {
      id: existing.id,
      maxConsecutiveSessions: existing.maxConsecutiveSessions,
      trainingDays: existing.trainingDays,
      trainingTime: existing.trainingTime,
      mealWindow: existing.mealWindow,
      lifeNotes: existing.lifeNotes,
      top3: existing.top3 ?? DEFAULT_TOP3,
      nonNegotiables: existing.nonNegotiables ?? [],
      notifications: existing.notifications ?? DEFAULT_NOTIFICATIONS,
    };
  }

  const [created] = await db
    .insert(trainerSettings)
    .values({
      organisationId: session.organisationId,
      userId: session.userId,
    })
    .returning();

  return {
    id: created.id,
    maxConsecutiveSessions: created.maxConsecutiveSessions,
    trainingDays: created.trainingDays,
    trainingTime: created.trainingTime,
    mealWindow: created.mealWindow,
    lifeNotes: created.lifeNotes,
    top3: created.top3 ?? DEFAULT_TOP3,
    nonNegotiables: created.nonNegotiables ?? [],
    notifications: created.notifications ?? DEFAULT_NOTIFICATIONS,
  };
}

export type ScheduleBlockRow = {
  id: string;
  dayOfWeek: number;
  timeSlot: string;
  blockType: "client" | "deep_work" | "admin" | "life" | "shutdown";
  label: string;
  memberId: string | null;
};

export async function getScheduleBlocks(session: SessionPayload): Promise<ScheduleBlockRow[]> {
  const rows = await db
    .select({
      id: scheduleBlocks.id,
      dayOfWeek: scheduleBlocks.dayOfWeek,
      timeSlot: scheduleBlocks.timeSlot,
      blockType: scheduleBlocks.blockType,
      label: scheduleBlocks.label,
      memberId: scheduleBlocks.memberId,
    })
    .from(scheduleBlocks)
    .where(eq(scheduleBlocks.trainerId, session.userId))
    .orderBy(scheduleBlocks.dayOfWeek, scheduleBlocks.timeSlot);

  return rows;
}

export type MoneyClientRow = {
  planId: string;
  memberId: string;
  memberName: string;
  planName: string;
  packageValue: number;
  amountDue: number;
  sessionsRemaining: number;
  totalSessions: number;
  trainerShareBps: number;
};

export async function getTrainerMoneySummary(session: SessionPayload) {
  const clients = await db
    .select({
      planId: memberPlans.id,
      memberId: members.id,
      memberName: members.name,
      planName: memberPlans.planName,
      packageValue: memberPlans.packageValue,
      amountDue: memberPlans.amountDue,
      sessionsRemaining: memberPlans.sessionsRemaining,
      totalSessions: memberPlans.totalSessions,
      trainerShareBps: memberPlans.trainerShareBps,
    })
    .from(memberPlans)
    .innerJoin(members, eq(memberPlans.memberId, members.id))
    .innerJoin(
      coachingRelationships,
      and(
        eq(coachingRelationships.memberId, members.id),
        eq(coachingRelationships.trainerId, session.userId),
        eq(coachingRelationships.active, true),
      ),
    )
    .where(and(eq(memberPlans.status, "active"), eq(members.organisationId, session.organisationId)))
    .orderBy(desc(memberPlans.amountDue));

  const totalDue = clients.reduce((sum, c) => sum + (c.amountDue ?? 0), 0);
  const totalPackage = clients.reduce((sum, c) => sum + (c.packageValue ?? 0), 0);
  const collected = totalPackage - totalDue;
  const trainerCollected = clients.reduce(
    (sum, c) => sum + trainerCollectedInr(c.packageValue, c.amountDue, c.trainerShareBps),
    0,
  );
  const trainerDue = clients.reduce(
    (sum, c) => sum + applyShareBps(c.amountDue ?? 0, c.trainerShareBps),
    0,
  );
  const trainerPackage = clients.reduce(
    (sum, c) => sum + applyShareBps(c.packageValue ?? 0, c.trainerShareBps),
    0,
  );
  const lowSessions = clients.filter((c) => c.sessionsRemaining <= 2);

  return {
    clients,
    totalDue,
    totalPackage,
    collected,
    trainerCollected,
    trainerDue,
    trainerPackage,
    lowSessions,
  };
}

export async function getTrainerProfile(session: SessionPayload) {
  const { trainerProfiles } = await import("@/db/schema");
  const [profile] = await db
    .select()
    .from(trainerProfiles)
    .where(eq(trainerProfiles.userId, session.userId))
    .limit(1);
  return profile ?? null;
}

export async function getPaymentRecordsForMember(memberId: string) {
  const { paymentRecords } = await import("@/db/schema");
  return db
    .select()
    .from(paymentRecords)
    .where(eq(paymentRecords.memberId, memberId))
    .orderBy(desc(paymentRecords.createdAt))
    .limit(20);
}

export async function getMemberAttendanceHistory(memberId: string) {
  const checkIns = await db
    .select()
    .from(attendanceRecords)
    .where(eq(attendanceRecords.memberId, memberId))
    .orderBy(desc(attendanceRecords.checkedInAt))
    .limit(30);

  const sessionRows = await db
    .select({
      id: sessions.id,
      scheduledAt: sessions.scheduledAt,
      status: sessions.status,
      completedAt: sessions.completedAt,
    })
    .from(sessions)
    .where(eq(sessions.memberId, memberId))
    .orderBy(desc(sessions.scheduledAt))
    .limit(30);

  return { checkIns, sessions: sessionRows };
}

export async function getMemberPersonalRecords(memberId: string) {
  const logs = await db
    .select({
      exerciseName: sessionExerciseLogs.exerciseName,
      load: sessionExerciseLogs.load,
      reps: sessionExerciseLogs.reps,
      scheduledAt: sessions.scheduledAt,
    })
    .from(sessionExerciseLogs)
    .innerJoin(sessions, eq(sessionExerciseLogs.sessionId, sessions.id))
    .where(and(eq(sessions.memberId, memberId), eq(sessions.status, "completed")))
    .orderBy(sessions.scheduledAt);

  const byExercise = new Map<
    string,
    { exerciseName: string; bestLoad: number; bestReps: string; date: string; firstLoad: number; latestLoad: number }
  >();

  for (const log of logs) {
    const load = Number.parseFloat((log.load ?? "").replace(/[^\d.]/g, ""));
    if (!Number.isFinite(load) || load <= 0) continue;
    const existing = byExercise.get(log.exerciseName);
    if (!existing) {
      byExercise.set(log.exerciseName, {
        exerciseName: log.exerciseName,
        bestLoad: load,
        bestReps: log.reps ?? "—",
        date: log.scheduledAt.toISOString(),
        firstLoad: load,
        latestLoad: load,
      });
    } else {
      existing.latestLoad = load;
      if (load >= existing.bestLoad) {
        existing.bestLoad = load;
        existing.bestReps = log.reps ?? existing.bestReps;
        existing.date = log.scheduledAt.toISOString();
      }
    }
  }

  return Array.from(byExercise.values()).sort((a, b) => b.bestLoad - a.bestLoad);
}

