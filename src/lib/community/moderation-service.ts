import { eq } from "drizzle-orm";
import { messageReports, messages } from "@/db/schema";
import type { db } from "@/db";
import { publishEvent } from "@/lib/domain/publish-event";
import { assertReportTransition, InvalidStateTransitionError } from "@/lib/domain/state-machines";

type DbExecutor = Pick<typeof db, "insert" | "update" | "select">;

export async function resolveMessageReport(
  tx: DbExecutor,
  input: {
    reportId: string;
    messageId: string;
    organisationId: string;
    from: (typeof messageReports.$inferSelect)["status"];
    to: (typeof messageReports.$inferSelect)["status"];
    resolution: string;
    actorId: string;
  },
) {
  assertReportTransition(input.from, input.to);

  const [report] = await tx
    .update(messageReports)
    .set({
      status: input.to,
      resolution: input.resolution,
      resolvedBy: input.actorId,
      resolvedAt: new Date(),
    })
    .where(eq(messageReports.id, input.reportId))
    .returning();

  if (input.to === "action_taken") {
    await tx
      .update(messages)
      .set({ hidden: true, body: "[Message removed by moderation]" })
      .where(eq(messages.id, input.messageId));
  }

  return report;
}

export async function createMessageReport(
  tx: DbExecutor,
  input: {
    organisationId: string;
    messageId: string;
    reporterId: string;
    reason: string;
  },
) {
  const [report] = await tx
    .insert(messageReports)
    .values({
      organisationId: input.organisationId,
      messageId: input.messageId,
      reporterId: input.reporterId,
      reason: input.reason,
      status: "pending",
    })
    .returning();

  await publishEvent(tx, {
    organisationId: input.organisationId,
    type: "MessageReported",
    actorId: input.reporterId,
    entityType: "message_report",
    entityId: report.id,
    payload: { messageId: input.messageId, reason: input.reason },
  });

  return report;
}

export { InvalidStateTransitionError };
