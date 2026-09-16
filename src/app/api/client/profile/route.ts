import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { members } from "@/db/schema";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { PERMISSIONS } from "@/lib/permissions";

const patchSchema = z.object({
  goal: z.string().min(1).max(500),
});

export async function PATCH(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.PROGRAM_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = patchSchema.parse(await request.json());

  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.userId, session.userId))
    .limit(1);
  if (!member) return apiError("Member not found", 404);

  await db
    .update(members)
    .set({ goal: body.goal, updatedAt: new Date() })
    .where(eq(members.id, member.id));

  return apiOk({});
}
