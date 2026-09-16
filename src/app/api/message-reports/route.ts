import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { members, messageReports, messages } from "@/db/schema";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { createMessageReport } from "@/lib/community/moderation-service";
import { PERMISSIONS } from "@/lib/permissions";
import { getModerationQueue } from "@/modules/community-queries";

const createSchema = z.object({
  messageId: z.string().uuid(),
  reason: z.string().min(3),
});

export async function GET() {
  const { error, session } = await requireApiSession(PERMISSIONS.MODERATION_VIEW);
  if (error || !session) return error;

  const reports = await getModerationQueue(session);
  return apiOk({ reports });
}

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.MESSAGE_CLIENT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = createSchema.parse(await request.json());

  const [message] = await db
    .select()
    .from(messages)
    .where(
      and(eq(messages.id, body.messageId), eq(messages.organisationId, session.organisationId)),
    )
    .limit(1);

  if (!message) return apiError("Message not found", 404);

  if (session.activeRole === "client") {
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.userId, session.userId))
      .limit(1);
    if (!member || member.id !== message.memberId) {
      return apiError("Cannot report this message", 403);
    }
  }

  const report = await db.transaction(async (tx) =>
    createMessageReport(tx, {
      organisationId: session.organisationId,
      messageId: body.messageId,
      reporterId: session.userId,
      reason: body.reason,
    }),
  );

  return apiOk({ report });
}
