import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { communityGroupMembers, communityGroups } from "@/db/schema";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireApiSession(PERMISSIONS.COMMUNITY_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const { id: groupId } = await params;

  const [group] = await db
    .select()
    .from(communityGroups)
    .where(
      and(eq(communityGroups.id, groupId), eq(communityGroups.organisationId, session.organisationId)),
    )
    .limit(1);

  if (!group || !group.active) return apiError("Group not found", 404);

  const [existing] = await db
    .select()
    .from(communityGroupMembers)
    .where(
      and(eq(communityGroupMembers.groupId, groupId), eq(communityGroupMembers.userId, session.userId)),
    )
    .limit(1);

  if (existing) return apiOk({ membership: existing });

  const [membership] = await db
    .insert(communityGroupMembers)
    .values({
      groupId,
      userId: session.userId,
      role: "member",
    })
    .returning();

  return apiOk({ membership });
}
