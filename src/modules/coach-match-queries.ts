import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  coachMatchInteractions,
  members,
  roleAssignments,
  trainerCredentials,
  trainerProfiles,
  users,
  centres,
} from "@/db/schema";
import { scoreTrainerMatch } from "@/lib/coach-match/scoring";
import type { SessionPayload } from "@/lib/session";

export type ScoredTrainer = {
  id: string;
  name: string;
  centreName: string;
  centreId: string;
  specialties: string[];
  bio: string;
  sessionsPerWeek: string;
  verified: boolean;
  verifiedCredentialCount: number;
  matchScore: number;
  matchReasons: string[];
  interactionStatus: string | null;
  meetingType: string | null;
};

async function getMemberForSession(session: SessionPayload) {
  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.userId, session.userId))
    .limit(1);
  return member ?? null;
}

export async function getCoachMatchBoard(session: SessionPayload): Promise<{
  memberGoal: string | null;
  trainers: ScoredTrainer[];
}> {
  const member = await getMemberForSession(session);

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
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
      and(
        eq(roleAssignments.organisationId, session.organisationId),
        eq(roleAssignments.role, "trainer"),
      ),
    );

  const trainerIds = rows.map((r) => r.id);
  const credCounts =
    trainerIds.length > 0
      ? await db
          .select({
            trainerId: trainerCredentials.trainerId,
            count: sql<number>`count(*)`.mapWith(Number),
          })
          .from(trainerCredentials)
          .where(
            and(
              eq(trainerCredentials.organisationId, session.organisationId),
              eq(trainerCredentials.verified, true),
              inArray(trainerCredentials.trainerId, trainerIds),
            ),
          )
          .groupBy(trainerCredentials.trainerId)
      : [];

  const credMap = new Map(credCounts.map((c) => [c.trainerId, c.count]));

  const interactions =
    member != null
      ? await db
          .select()
          .from(coachMatchInteractions)
          .where(eq(coachMatchInteractions.memberId, member.id))
      : [];

  const interactionMap = new Map(interactions.map((i) => [i.trainerId, i]));

  const defaultBio =
    "LMNT-certified coach focused on assessment-led programming and accountable progress.";

  const trainers: ScoredTrainer[] = rows
    .filter((r): r is typeof r & { centreId: string } => r.centreId != null)
    .filter((r) => r.marketplaceVisible !== false)
    .map((r) => {
      const verifiedCredentialCount = credMap.get(r.id) ?? 0;
      const scored = scoreTrainerMatch(
        { goal: member?.goal ?? null, centreId: member?.centreId ?? null },
        {
          id: r.id,
          name: r.name,
          centreId: r.centreId,
          centreName: r.centreName,
          specialties: r.specialties?.length ? r.specialties : ["General fitness", "PT"],
          bio: r.bio ?? defaultBio,
          sessionsPerWeek: r.sessionsPerWeek ?? "3–5 sessions / week",
          verifiedCredentialCount,
        },
      );
      const interaction = interactionMap.get(r.id);
      return {
        id: r.id,
        name: r.name,
        centreId: r.centreId,
        centreName: r.centreName,
        specialties: r.specialties?.length ? r.specialties : ["General fitness", "PT"],
        bio: r.bio ?? defaultBio,
        sessionsPerWeek: r.sessionsPerWeek ?? "3–5 sessions / week",
        verified: verifiedCredentialCount > 0,
        verifiedCredentialCount,
        matchScore: scored.score,
        matchReasons: scored.reasons,
        interactionStatus: interaction?.status ?? null,
        meetingType: interaction?.meetingType ?? null,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  return {
    memberGoal: member?.goal ?? null,
    trainers,
  };
}
