import { randomUUID } from "crypto";
import { outboxEvents } from "@/db/schema";
import type { db } from "@/db";
import type { DomainEventPayload, PublishEventInput } from "@/lib/domain/events";

type DbExecutor = Pick<typeof db, "insert">;

export async function publishEvent(client: DbExecutor, input: PublishEventInput): Promise<string> {
  const correlationId = input.correlationId ?? randomUUID();
  const timestamp = new Date().toISOString();

  const payload: DomainEventPayload = {
    ...input.payload,
    correlationId,
    version: "1",
    timestamp,
    actorId: input.actorId,
    entityType: input.entityType,
    entityId: input.entityId,
  };

  await client.insert(outboxEvents).values({
    organisationId: input.organisationId,
    type: input.type,
    payload,
    correlationId,
    actorId: input.actorId ?? null,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    version: "1",
  });

  return correlationId;
}
