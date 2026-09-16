import { tasks } from "@/db/schema";
import type { db } from "@/db";
import { publishEvent } from "@/lib/domain/publish-event";

type DbExecutor = Pick<typeof db, "insert">;

export async function createSessionEscalationTask(
  client: DbExecutor,
  input: {
    organisationId: string;
    centreId: string;
    ownerId: string;
    sessionId: string;
    memberId: string;
    memberName: string;
    reasons: string[];
    actorId: string;
  },
) {
  if (input.reasons.length === 0) return null;

  const primary = input.reasons[0];
  const eventType = primary === "pain_flagged" ? "PainFlagged" : "LowFeedback";
  const title =
    primary === "pain_flagged"
      ? `Review pain report — ${input.memberName}`
      : `Follow up session feedback — ${input.memberName}`;

  const dueAt = new Date(Date.now() + 24 * 3600000);

  const [task] = await client
    .insert(tasks)
    .values({
      organisationId: input.organisationId,
      centreId: input.centreId,
      ownerId: input.ownerId,
      title,
      description: `Auto-created after session closure. Reasons: ${input.reasons.join(", ")}.`,
      status: "open",
      dueAt,
      triggerEvent: eventType,
    })
    .returning();

  await publishEvent(client, {
    organisationId: input.organisationId,
    type: eventType,
    actorId: input.actorId,
    entityType: "session",
    entityId: input.sessionId,
    payload: {
      taskId: task.id,
      memberId: input.memberId,
      reasons: input.reasons,
    },
  });

  await publishEvent(client, {
    organisationId: input.organisationId,
    type: "TaskCreated",
    actorId: input.actorId,
    entityType: "task",
    entityId: task.id,
    payload: {
      triggerEvent: eventType,
      sessionId: input.sessionId,
      memberId: input.memberId,
    },
  });

  return task;
}
