import { z } from "zod";
import { db } from "@/db";
import { communityGroupMembers, communityGroups } from "@/db/schema";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { publishEvent } from "@/lib/domain/publish-event";
import { PERMISSIONS } from "@/lib/permissions";
import { getCommunityGroups } from "@/modules/community-queries";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  centreId: z.string().uuid().optional(),
});

export async function GET() {
  const { error, session } = await requireApiSession(PERMISSIONS.COMMUNITY_VIEW);
  if (error || !session) return error;

  const groups = await getCommunityGroups(session);
  return apiOk({ groups });
}

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.COMMUNITY_MANAGE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = createSchema.parse(await request.json());

  if (
    session.activeRole === "centre_manager" &&
    body.centreId &&
    !session.centreIds.includes(body.centreId)
  ) {
    return apiError("Cannot create groups outside your branch", 403);
  }

  const group = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(communityGroups)
      .values({
        organisationId: session.organisationId,
        centreId: body.centreId,
        name: body.name,
        description: body.description,
        createdBy: session.userId,
      })
      .returning();

    await tx.insert(communityGroupMembers).values({
      groupId: row.id,
      userId: session.userId,
      role: "owner",
    });

    await publishEvent(tx, {
      organisationId: session.organisationId,
      type: "GroupCreated",
      actorId: session.userId,
      entityType: "community_group",
      entityId: row.id,
      payload: { name: row.name, centreId: row.centreId },
    });

    return row;
  });

  return apiOk({ group });
}
