import { and, desc, eq, gte, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { assessments, members, users } from "@/db/schema";
import { orgAndCentreScope } from "@/lib/branch-scope";
import type { SessionPayload } from "@/lib/session";

export async function getAssessmentScheduleRows(session: SessionPayload) {
  const scope = orgAndCentreScope(session, assessments.organisationId, assessments.centreId);

  return db
    .select({
      id: assessments.id,
      memberId: assessments.memberId,
      memberName: members.name,
      trainerId: assessments.trainerId,
      trainerName: users.name,
      scheduledAt: assessments.scheduledAt,
      status: assessments.status,
      notes: assessments.notes,
      goal: members.goal,
    })
    .from(assessments)
    .innerJoin(members, eq(assessments.memberId, members.id))
    .leftJoin(users, eq(assessments.trainerId, users.id))
    .where(and(scope, isNotNull(assessments.scheduledAt), gte(assessments.scheduledAt, new Date(0))))
    .orderBy(desc(assessments.scheduledAt))
    .limit(100);
}

export { getCentreMembers } from "@/modules/queries";