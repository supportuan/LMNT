import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { coachingRelationships } from "@/db/schema";

export async function assignTrainerToMember({
  organisationId,
  centreId,
  memberId,
  trainerId,
}: {
  organisationId: string;
  centreId: string;
  memberId: string;
  trainerId: string | null;
}) {
  await db
    .update(coachingRelationships)
    .set({ active: false })
    .where(and(eq(coachingRelationships.memberId, memberId), eq(coachingRelationships.active, true)));

  if (!trainerId) return;

  await db.insert(coachingRelationships).values({
    organisationId,
    centreId,
    memberId,
    trainerId,
    active: true,
  });
}
