import { z } from "zod";
import { assertSessionAccess } from "@/lib/access";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { closeSession } from "@/lib/domain/session-service";
import { PERMISSIONS } from "@/lib/permissions";

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  notes: z.string().min(1),
  rpe: z.number().min(1).max(10),
  energy: z.string().min(1),
  painFlag: z.boolean().optional(),
});

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.SESSION_LOG);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = bodySchema.parse(await request.json());

  try {
    await assertSessionAccess(session, body.sessionId);
  } catch {
    return apiError("Not found", 404);
  }

  const result = await closeSession({
    sessionId: body.sessionId,
    actor: session,
    rpe: body.rpe,
    painFlag: body.painFlag,
    notes: body.notes,
    energy: body.energy,
  });

  if ("error" in result && result.error) {
    return apiError(result.error, 400);
  }

  return apiOk({ escalated: result.escalated });
}
