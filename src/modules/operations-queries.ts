import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { assets, users, workRequests } from "@/db/schema";
import { orgAndCentreScope } from "@/lib/branch-scope";
import type { SessionPayload } from "@/lib/session";

export type WorkRequestRow = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assetId: string | null;
  assetName: string | null;
  centreId: string;
  requestedBy: string;
  requesterName: string;
  assignedTo: string | null;
  approvedBy: string | null;
  slaDueAt: string;
  completedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  slaOverdue: boolean;
};

export async function getWorkRequests(session: SessionPayload): Promise<WorkRequestRow[]> {
  let condition = orgAndCentreScope(
    session,
    workRequests.organisationId,
    workRequests.centreId,
  )!;

  if (session.activeRole === "trainer") {
    condition = and(
      condition,
      eq(workRequests.requestedBy, session.userId),
    )!;
  }

  const rows = await db
    .select({
      id: workRequests.id,
      title: workRequests.title,
      description: workRequests.description,
      priority: workRequests.priority,
      status: workRequests.status,
      assetId: workRequests.assetId,
      assetName: assets.name,
      centreId: workRequests.centreId,
      requestedBy: workRequests.requestedBy,
      requesterName: users.name,
      assignedTo: workRequests.assignedTo,
      approvedBy: workRequests.approvedBy,
      slaDueAt: workRequests.slaDueAt,
      completedAt: workRequests.completedAt,
      rejectionReason: workRequests.rejectionReason,
      createdAt: workRequests.createdAt,
    })
    .from(workRequests)
    .innerJoin(users, eq(workRequests.requestedBy, users.id))
    .leftJoin(assets, eq(workRequests.assetId, assets.id))
    .where(condition)
    .orderBy(desc(workRequests.createdAt))
    .limit(100);

  const now = Date.now();

  return rows.map((row) => ({
    ...row,
    slaDueAt: row.slaDueAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    slaOverdue:
      ["submitted", "approved", "in_progress"].includes(row.status) &&
      row.slaDueAt.getTime() < now,
  }));
}

export async function getWorkRequestStats(session: SessionPayload) {
  const rows = await getWorkRequests(session);
  return {
    open: rows.filter((r) => ["submitted", "approved", "in_progress"].includes(r.status)).length,
    overdue: rows.filter((r) => r.slaOverdue).length,
    completed: rows.filter((r) => r.status === "completed").length,
  };
}
