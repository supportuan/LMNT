import { db } from "@/db";
import { auditEntries } from "@/db/schema";
import type { SessionPayload } from "@/lib/session";

export async function writeAudit(
  session: SessionPayload,
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
) {
  await db.insert(auditEntries).values({
    actorId: session.userId,
    actorRole: session.activeRole,
    organisationId: session.organisationId,
    centreId: session.activeCentreId ?? session.centreIds[0] ?? null,
    action,
    resourceType,
    resourceId: resourceId ?? null,
    metadata,
  });
}
