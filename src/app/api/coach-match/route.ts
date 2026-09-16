import { apiOk, requireApiSession } from "@/lib/api-helpers";
import { PERMISSIONS } from "@/lib/permissions";
import { getCoachMatchBoard } from "@/modules/coach-match-queries";

export async function GET() {
  const { error, session } = await requireApiSession(PERMISSIONS.COACH_MATCH);
  if (error || !session) return error;

  const board = await getCoachMatchBoard(session);
  return apiOk(board);
}
