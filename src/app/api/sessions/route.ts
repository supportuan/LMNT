import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { members, sessions } from "@/db/schema";
import { assertMemberAccess } from "@/lib/access";
import { apiError, apiOk, centreIdForSession, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/permissions";

const schema = z.object({
  memberId: z.string().uuid(),
  programmeId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime(),
  trainerId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.SESSION_EDIT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = schema.parse(await request.json());
  try {
    await assertMemberAccess(session, body.memberId);
  } catch {
    return apiError("Not found", 404);
  }

  const [member] = await db
    .select({ centreId: members.centreId })
    .from(members)
    .where(eq(members.id, body.memberId))
    .limit(1);

  const centreId = member?.centreId ?? centreIdForSession(session);
  if (!centreId) return apiError("No centre assigned", 400);

  const canAssignTrainer = session.activeRole === "admin" || session.activeRole === "centre_manager";
  const trainerId = canAssignTrainer && body.trainerId ? body.trainerId : session.userId;

  const [row] = await db
    .insert(sessions)
    .values({
      organisationId: session.organisationId,
      centreId,
      memberId: body.memberId,
      trainerId,
      programmeId: body.programmeId,
      scheduledAt: new Date(body.scheduledAt),
      status: "scheduled",
    })
    .returning();

  await writeAudit(session, "session.scheduled", "session", row.id);
  return apiOk({ session: row });
}
