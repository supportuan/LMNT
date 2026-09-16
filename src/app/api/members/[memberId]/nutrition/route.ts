import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { nutritionPlans } from "@/db/schema";
import { assertMemberAccess } from "@/lib/access";
import { apiError, apiOk, centreIdForSession, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/permissions";

const schema = z.object({
  calories: z.number().nullable().optional(),
  protein: z.number().nullable().optional(),
  carbs: z.number().nullable().optional(),
  fat: z.number().nullable().optional(),
  dietPreference: z.string().optional(),
  mealStructure: z.string().optional(),
  mealTiming: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const { memberId } = await params;
  const { error, session } = await requireApiSession(PERMISSIONS.NUTRITION_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  try {
    await assertMemberAccess(session, memberId);
  } catch {
    return apiError("Not found", 404);
  }

  const [plan] = await db
    .select()
    .from(nutritionPlans)
    .where(eq(nutritionPlans.memberId, memberId))
    .limit(1);

  return apiOk({ plan: plan ?? null });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const { memberId } = await params;
  const { error, session } = await requireApiSession(PERMISSIONS.NUTRITION_EDIT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const centreId = centreIdForSession(session);
  if (!centreId) return apiError("No centre assigned", 400);

  try {
    await assertMemberAccess(session, memberId);
  } catch {
    return apiError("Not found", 404);
  }

  const body = schema.parse(await request.json());

  const [existing] = await db
    .select()
    .from(nutritionPlans)
    .where(eq(nutritionPlans.memberId, memberId))
    .limit(1);

  if (existing) {
    await db
      .update(nutritionPlans)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(nutritionPlans.id, existing.id));
  } else {
    await db.insert(nutritionPlans).values({
      organisationId: session.organisationId,
      centreId,
      memberId,
      trainerId: session.userId,
      ...body,
    });
  }

  await writeAudit(session, "nutrition.updated", "member", memberId);
  return apiOk({});
}
