import { z } from "zod";
import { apiError, apiOk, centreIdForSession, requireApiSession, resolveCentreId } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { runHygieneAutomation } from "@/lib/domain/hygiene-automation";
import { createWorkRequest, processOverdueWorkRequests } from "@/lib/domain/work-request-service";
import { PERMISSIONS } from "@/lib/permissions";
import { getWorkRequests } from "@/modules/operations-queries";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assetId: z.string().uuid().optional(),
  centreId: z.string().uuid().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
});

export async function GET() {
  const { error, session } = await requireApiSession(PERMISSIONS.WORK_REQUEST_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  await processOverdueWorkRequests(session.organisationId);

  const centreId = centreIdForSession(session);
  if (centreId && (session.activeRole === "admin" || session.activeRole === "centre_manager")) {
    await runHygieneAutomation({
      organisationId: session.organisationId,
      centreId,
      actorId: session.userId,
    });
  }

  const requests = await getWorkRequests(session);
  return apiOk({ requests });
}

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.WORK_REQUEST_CREATE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = createSchema.parse(await request.json());
  const centreId = resolveCentreId(session, body.centreId);
  if (!centreId) return apiError("No centre assigned", 400);

  const row = await createWorkRequest({
    centreId,
    assetId: body.assetId,
    title: body.title,
    description: body.description,
    priority: body.priority,
    actor: session,
  });

  await writeAudit(session, "work_request.created", "work_request", row.id, {
    assetId: body.assetId,
    priority: body.priority,
  });

  return apiOk({ workRequest: row });
}
