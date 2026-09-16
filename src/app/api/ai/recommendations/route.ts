import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { aiRecommendations } from "@/db/schema";
import { apiOk, requireApiSession } from "@/lib/api-helpers";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.MESSAGE_CLIENT);
  if (error || !session) return error;

  const memberId = new URL(request.url).searchParams.get("memberId");

  const rows = await db
    .select()
    .from(aiRecommendations)
    .where(
      and(
        eq(aiRecommendations.organisationId, session.organisationId),
        eq(aiRecommendations.trainerId, session.userId),
        memberId ? eq(aiRecommendations.memberId, memberId) : undefined,
      ),
    )
    .orderBy(desc(aiRecommendations.createdAt))
    .limit(20);

  return apiOk({ recommendations: rows });
}
