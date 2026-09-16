import { z } from "zod";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { updateWorkRequest } from "@/lib/domain/work-request-service";
import { PERMISSIONS } from "@/lib/permissions";

const patchSchema = z.object({
  status: z.enum(["approved", "rejected", "in_progress", "completed", "cancelled"]).optional(),
  assignedTo: z.string().uuid().optional(),
  rejectionReason: z.string().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { error, session } = await requireApiSession(PERMISSIONS.WORK_REQUEST_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const { id } = await context.params;
  const body = patchSchema.parse(await request.json());

  if (
    (body.status === "approved" || body.status === "rejected") &&
    session.activeRole !== "admin" &&
    session.activeRole !== "centre_manager"
  ) {
    return apiError("Forbidden", 403);
  }

  const result = await updateWorkRequest({
    workRequestId: id,
    actor: session,
    status: body.status,
    assignedTo: body.assignedTo,
    rejectionReason: body.rejectionReason,
  });

  if ("error" in result && result.error) {
    const message = result.error;
    const status = message === "Forbidden" ? 403 : message === "Not found" ? 404 : 400;
    return apiError(message, status);
  }

  await writeAudit(session, "work_request.updated", "work_request", id, { status: body.status });
  return apiOk({});
}
