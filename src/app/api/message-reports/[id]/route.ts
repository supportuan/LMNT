import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { messageReports } from "@/db/schema";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import {
  resolveMessageReport,
  InvalidStateTransitionError,
} from "@/lib/community/moderation-service";
import { PERMISSIONS } from "@/lib/permissions";

const patchSchema = z.object({
  status: z.enum(["dismissed", "action_taken", "escalated"]),
  resolution: z.string().min(1),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireApiSession(PERMISSIONS.MODERATION_MANAGE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const { id } = await params;
  const body = patchSchema.parse(await request.json());

  const [report] = await db
    .select()
    .from(messageReports)
    .where(
      and(eq(messageReports.id, id), eq(messageReports.organisationId, session.organisationId)),
    )
    .limit(1);

  if (!report) return apiError("Not found", 404);

  try {
    const updated = await db.transaction(async (tx) =>
      resolveMessageReport(tx, {
        reportId: report.id,
        messageId: report.messageId,
        organisationId: session.organisationId,
        from: report.status,
        to: body.status,
        resolution: body.resolution,
        actorId: session.userId,
      }),
    );

    await writeAudit(session, "message_report.resolved", "message_report", report.id, {
      status: body.status,
    });
    return apiOk({ report: updated });
  } catch (e) {
    if (e instanceof InvalidStateTransitionError) return apiError(e.message, 400);
    throw e;
  }
}
