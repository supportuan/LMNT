import { allocationDecisions } from "@/db/schema";
import type { db } from "@/db";

type DbExecutor = Pick<typeof db, "insert">;

export type RecordAllocationInput = {
  organisationId: string;
  centreId: string;
  leadId: string;
  ownerId: string;
  reason: string;
  ruleVersion?: string;
};

export async function recordAllocationDecision(client: DbExecutor, input: RecordAllocationInput) {
  const [row] = await client
    .insert(allocationDecisions)
    .values({
      organisationId: input.organisationId,
      centreId: input.centreId,
      leadId: input.leadId,
      ownerId: input.ownerId,
      reason: input.reason,
      ruleVersion: input.ruleVersion ?? "manual_v1",
    })
    .returning();

  return row;
}
