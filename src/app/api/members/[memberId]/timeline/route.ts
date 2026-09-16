import { assertMemberAccess } from "@/lib/access";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { PERMISSIONS } from "@/lib/permissions";
import { getMemberTimeline } from "@/modules/member-timeline";

type RouteContext = { params: Promise<{ memberId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const { memberId } = await context.params;

  try {
    await assertMemberAccess(session, memberId);
  } catch {
    return apiError("Not found", 404);
  }

  const timeline = await getMemberTimeline(session, memberId);
  return apiOk({ timeline });
}
