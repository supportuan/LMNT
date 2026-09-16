import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { trainerSettings } from "@/db/schema";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { syncLifeBlocksFromSettings } from "@/lib/coach-life/life-blocks";
import { PERMISSIONS } from "@/lib/permissions";
import { getTrainerSettings } from "@/modules/trainer-queries";

const patchSchema = z.object({
  maxConsecutiveSessions: z.number().min(1).max(12).optional(),
  trainingDays: z.string().optional(),
  trainingTime: z.string().optional(),
  mealWindow: z.string().optional(),
  lifeNotes: z.string().optional(),
  top3: z.array(z.string()).max(3).optional(),
  nonNegotiables: z.array(z.object({ label: z.string(), done: z.boolean() })).optional(),
  notifications: z
    .object({
      sessionReminders: z.boolean(),
      clientUpdates: z.boolean(),
      emailDigest: z.boolean(),
    })
    .optional(),
});

export async function GET() {
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const settings = await getTrainerSettings(session);
  return apiOk({ settings });
}

export async function PATCH(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = patchSchema.parse(await request.json());
  await getTrainerSettings(session);

  const updates: Partial<typeof trainerSettings.$inferInsert> = { updatedAt: new Date() };
  if (body.maxConsecutiveSessions !== undefined) updates.maxConsecutiveSessions = body.maxConsecutiveSessions;
  if (body.trainingDays !== undefined) updates.trainingDays = body.trainingDays;
  if (body.trainingTime !== undefined) updates.trainingTime = body.trainingTime;
  if (body.mealWindow !== undefined) updates.mealWindow = body.mealWindow;
  if (body.lifeNotes !== undefined) updates.lifeNotes = body.lifeNotes;
  if (body.top3 !== undefined) updates.top3 = body.top3;
  if (body.nonNegotiables !== undefined) updates.nonNegotiables = body.nonNegotiables;
  if (body.notifications !== undefined) updates.notifications = body.notifications;

  await db
    .update(trainerSettings)
    .set(updates)
    .where(
      and(
        eq(trainerSettings.userId, session.userId),
        eq(trainerSettings.organisationId, session.organisationId),
      ),
    );

  const settings = await getTrainerSettings(session);

  let lifeBlocksSynced = null;
  if (
    body.trainingDays !== undefined ||
    body.trainingTime !== undefined ||
    body.mealWindow !== undefined
  ) {
    lifeBlocksSynced = await syncLifeBlocksFromSettings(session, {
      trainingDays: settings.trainingDays,
      trainingTime: settings.trainingTime,
      mealWindow: settings.mealWindow,
    });
  }

  return apiOk({ settings, lifeBlocksSynced });
}
