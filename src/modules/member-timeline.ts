import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  assessments,
  attendanceRecords,
  coachingRelationships,
  leads,
  memberPlans,
  members,
  onboardingAssignments,
  paymentRecords,
  programmes,
  progressSnapshots,
  sessions,
  users,
} from "@/db/schema";
import type { SessionPayload } from "@/lib/session";

export type TimelineEntry = {
  id: string;
  type:
    | "member_created"
    | "lead_converted"
    | "coaching_started"
    | "assessment"
    | "programme"
    | "session"
    | "payment"
    | "attendance"
    | "progress"
    | "onboarding";
  title: string;
  detail?: string;
  status?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
};

export async function getMemberTimeline(
  session: SessionPayload,
  memberId: string,
): Promise<TimelineEntry[]> {
  const [member] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  if (!member || member.organisationId !== session.organisationId) return [];

  const entries: TimelineEntry[] = [
    {
      id: `member-${member.id}`,
      type: "member_created",
      title: "Member profile created",
      detail: member.goal ?? undefined,
      status: member.status,
      occurredAt: member.createdAt.toISOString(),
    },
  ];

  const [sourceLead] = await db
    .select()
    .from(leads)
    .where(eq(leads.convertedMemberId, memberId))
    .limit(1);

  if (sourceLead) {
    entries.push({
      id: `lead-${sourceLead.id}`,
      type: "lead_converted",
      title: "Converted from lead",
      detail: sourceLead.source,
      status: sourceLead.stage,
      occurredAt: sourceLead.updatedAt.toISOString(),
      metadata: { leadId: sourceLead.id },
    });
  }

  const rels = await db
    .select({
      id: coachingRelationships.id,
      active: coachingRelationships.active,
      createdAt: coachingRelationships.createdAt,
      trainerName: users.name,
    })
    .from(coachingRelationships)
    .innerJoin(users, eq(coachingRelationships.trainerId, users.id))
    .where(eq(coachingRelationships.memberId, memberId))
    .orderBy(desc(coachingRelationships.createdAt));

  rels.forEach((rel) => {
    entries.push({
      id: `coaching-${rel.id}`,
      type: "coaching_started",
      title: rel.active ? "Coaching relationship active" : "Coaching relationship ended",
      detail: rel.trainerName,
      status: rel.active ? "active" : "inactive",
      occurredAt: rel.createdAt.toISOString(),
    });
  });

  const assessmentRows = await db
    .select()
    .from(assessments)
    .where(eq(assessments.memberId, memberId))
    .orderBy(desc(assessments.createdAt))
    .limit(20);

  assessmentRows.forEach((row) => {
    entries.push({
      id: `assessment-${row.id}`,
      type: "assessment",
      title: "Assessment",
      status: row.status,
      detail: row.referralRequired ? "Referral required" : undefined,
      occurredAt: (row.completedAt ?? row.createdAt).toISOString(),
      metadata: { referralRequired: row.referralRequired },
    });
  });

  const programmeRows = await db
    .select()
    .from(programmes)
    .where(eq(programmes.memberId, memberId))
    .orderBy(desc(programmes.createdAt))
    .limit(20);

  programmeRows.forEach((row) => {
    entries.push({
      id: `programme-${row.id}`,
      type: "programme",
      title: row.title,
      status: row.status,
      occurredAt: (row.startsAt ?? row.createdAt).toISOString(),
    });
  });

  const sessionRows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.memberId, memberId))
    .orderBy(desc(sessions.scheduledAt))
    .limit(30);

  sessionRows.forEach((row) => {
    entries.push({
      id: `session-${row.id}`,
      type: "session",
      title: "Training session",
      status: row.status,
      detail: row.painFlag ? "Pain flagged" : undefined,
      occurredAt: (row.completedAt ?? row.scheduledAt).toISOString(),
      metadata: { rpe: row.rpe, painFlag: row.painFlag },
    });
  });

  const paymentRows = await db
    .select()
    .from(paymentRecords)
    .where(eq(paymentRecords.memberId, memberId))
    .orderBy(desc(paymentRecords.createdAt))
    .limit(20);

  paymentRows.forEach((row) => {
    entries.push({
      id: `payment-${row.id}`,
      type: "payment",
      title: "Payment recorded",
      detail: `₹${row.amountInr.toLocaleString("en-IN")}`,
      occurredAt: row.createdAt.toISOString(),
      metadata: { method: row.method },
    });
  });

  const attendanceRows = await db
    .select()
    .from(attendanceRecords)
    .where(eq(attendanceRecords.memberId, memberId))
    .orderBy(desc(attendanceRecords.checkedInAt))
    .limit(20);

  attendanceRows.forEach((row) => {
    entries.push({
      id: `attendance-${row.id}`,
      type: "attendance",
      title: "Gym check-in",
      status: row.method,
      occurredAt: row.checkedInAt.toISOString(),
    });
  });

  const progressRows = await db
    .select()
    .from(progressSnapshots)
    .where(eq(progressSnapshots.memberId, memberId))
    .orderBy(desc(progressSnapshots.recordedAt))
    .limit(20);

  progressRows.forEach((row) => {
    entries.push({
      id: `progress-${row.id}`,
      type: "progress",
      title: "Progress snapshot",
      detail: row.weight != null ? `${row.weight} kg` : undefined,
      occurredAt: row.recordedAt.toISOString(),
    });
  });

  const onboardingRows = await db
    .select()
    .from(onboardingAssignments)
    .where(eq(onboardingAssignments.memberId, memberId))
    .orderBy(desc(onboardingAssignments.createdAt))
    .limit(5);

  onboardingRows.forEach((row) => {
    entries.push({
      id: `onboarding-${row.id}`,
      type: "onboarding",
      title: "Onboarding checklist",
      status: row.status,
      occurredAt: (row.completedAt ?? row.createdAt).toISOString(),
    });
  });

  const [activePlan] = await db
    .select()
    .from(memberPlans)
    .where(and(eq(memberPlans.memberId, memberId), eq(memberPlans.status, "active")))
    .limit(1);

  if (activePlan) {
    entries.push({
      id: `plan-${activePlan.id}`,
      type: "programme",
      title: `Package: ${activePlan.planName}`,
      status: activePlan.status,
      detail: `${activePlan.sessionsRemaining} sessions remaining`,
      occurredAt: activePlan.startsAt.toISOString(),
      metadata: {
        amountDue: activePlan.amountDue,
        packageValue: activePlan.packageValue,
      },
    });
  }

  return entries.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}
