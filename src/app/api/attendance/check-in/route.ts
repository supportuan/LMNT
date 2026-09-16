import { eq } from "drizzle-orm";
import { db } from "@/db";
import { attendanceRecords, members } from "@/db/schema";
import { apiError, apiOk, centreIdForSession, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST() {
  const { error, session } = await requireApiSession(PERMISSIONS.ATTENDANCE_WRITE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const centreId = centreIdForSession(session);
  if (!centreId) return apiError("No centre assigned", 400);

  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.userId, session.userId))
    .limit(1);

  const [record] = await db
    .insert(attendanceRecords)
    .values({
      organisationId: session.organisationId,
      centreId,
      memberId: member?.id,
      userId: session.userId,
      method: "selfie_gps",
    })
    .returning();

  await writeAudit(session, "attendance.check_in", "attendance", record.id);
  return apiOk({ record });
}
