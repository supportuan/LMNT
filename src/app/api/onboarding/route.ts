import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { onboardingAssignments } from "@/db/schema";
import { assertMemberAccess } from "@/lib/access";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/permissions";

export async function PATCH(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_EDIT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = z
    .object({
      assignmentId: z.string().uuid(),
      checklist: z.array(z.object({ item: z.string(), done: z.boolean() })).optional(),
      status: z.enum(["pending", "in_progress", "completed"]).optional(),
    })
    .parse(await request.json());

  const [assignment] = await db
    .select()
    .from(onboardingAssignments)
    .where(eq(onboardingAssignments.id, body.assignmentId))
    .limit(1);

  if (!assignment) return apiError("Not found", 404);

  try {
    await assertMemberAccess(session, assignment.memberId);
  } catch {
    return apiError("Not found", 404);
  }

  const updates: Partial<typeof onboardingAssignments.$inferInsert> = {};
  if (body.checklist) updates.checklist = body.checklist;
  if (body.status) {
    updates.status = body.status;
    if (body.status === "completed") updates.completedAt = new Date();
  }

  await db
    .update(onboardingAssignments)
    .set(updates)
    .where(eq(onboardingAssignments.id, body.assignmentId));

  await writeAudit(session, "onboarding.updated", "onboarding_assignment", body.assignmentId);
  return apiOk({});
}
