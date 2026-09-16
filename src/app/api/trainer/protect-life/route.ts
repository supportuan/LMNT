import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { syncLifeBlocksFromSettings } from "@/lib/coach-life/life-blocks";
import { PERMISSIONS } from "@/lib/permissions";
import { getTrainerSettings } from "@/modules/trainer-queries";

export async function POST() {
  const { error, session } = await requireApiSession(PERMISSIONS.CALENDAR_EDIT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const settings = await getTrainerSettings(session);
  const result = await syncLifeBlocksFromSettings(session, {
    trainingDays: settings.trainingDays,
    trainingTime: settings.trainingTime,
    mealWindow: settings.mealWindow,
  });

  return apiOk({ ...result });
}
