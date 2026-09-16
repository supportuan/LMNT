import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { coachMirrorAssessments } from "@/db/schema";
import type { SessionPayload } from "@/lib/session";

export type MirrorAssessmentRow = {
  id: string;
  overall: number;
  headline: string;
  weakDomain: string | null;
  profileScores: Record<string, number>;
  createdAt: Date;
};

export async function getCoachMirrorHistory(session: SessionPayload): Promise<MirrorAssessmentRow[]> {
  const rows = await db
    .select({
      id: coachMirrorAssessments.id,
      overall: coachMirrorAssessments.overall,
      headline: coachMirrorAssessments.headline,
      weakDomain: coachMirrorAssessments.weakDomain,
      profileScores: coachMirrorAssessments.profileScores,
      createdAt: coachMirrorAssessments.createdAt,
    })
    .from(coachMirrorAssessments)
    .where(eq(coachMirrorAssessments.trainerId, session.userId))
    .orderBy(desc(coachMirrorAssessments.createdAt))
    .limit(12);

  return rows.map((r) => ({
    ...r,
    profileScores: r.profileScores ?? {},
  }));
}

export async function getCoachMirrorSummary(session: SessionPayload) {
  const history = await getCoachMirrorHistory(session);
  if (history.length === 0) return null;

  const latest = history[0];
  const previous = history[1];
  const delta = previous ? latest.overall - previous.overall : null;

  return { latest, previous, delta, count: history.length };
}
