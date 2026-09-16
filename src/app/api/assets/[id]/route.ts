import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { parseOptionalDate } from "@/lib/format";
import { PERMISSIONS } from "@/lib/permissions";
import { withCentreScope } from "@/lib/branch-scope";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  serialNumber: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  purchaseDate: z.string().nullable().optional(),
  purchaseCost: z.number().int().nonnegative().nullable().optional(),
  status: z.enum(["operational", "down", "maintenance"]).optional(),
  assignedTrainerId: z.union([z.string().uuid(), z.literal(""), z.null()]).optional(),
  assignedArea: z.string().nullable().optional(),
  warrantyUntil: z.string().nullable().optional(),
  lastServiceAt: z.string().nullable().optional(),
  nextMaintenanceAt: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  retiredAt: z.string().nullable().optional(),
  action: z.enum(["assign", "schedule_maintenance", "mark_damaged", "retire", "restore"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireApiSession(PERMISSIONS.ORG_SETTINGS);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const { id } = await params;
  const body = updateSchema.parse(await request.json());

  let condition = and(eq(assets.id, id), eq(assets.organisationId, session.organisationId))!;
  condition = withCentreScope(session, condition, assets.centreId);

  const [existing] = await db.select({ id: assets.id }).from(assets).where(condition).limit(1);
  if (!existing) return apiError("Not found", 404);

  const updates: Partial<typeof assets.$inferInsert> = {};
  if (body.name) updates.name = body.name;
  if (body.category) updates.category = body.category;
  if (body.serialNumber !== undefined) updates.serialNumber = body.serialNumber;
  if (body.location !== undefined) updates.location = body.location;
  if (body.purchaseDate !== undefined) updates.purchaseDate = parseOptionalDate(body.purchaseDate);
  if (body.purchaseCost !== undefined) updates.purchaseCost = body.purchaseCost;
  if (body.status) updates.status = body.status;
  if (body.assignedTrainerId !== undefined) {
    updates.assignedTrainerId = body.assignedTrainerId && body.assignedTrainerId !== "" ? body.assignedTrainerId : null;
  }
  if (body.assignedArea !== undefined) updates.assignedArea = body.assignedArea;
  if (body.warrantyUntil !== undefined) updates.warrantyUntil = parseOptionalDate(body.warrantyUntil);
  if (body.lastServiceAt !== undefined) updates.lastServiceAt = parseOptionalDate(body.lastServiceAt);
  if (body.nextMaintenanceAt !== undefined) {
    updates.nextMaintenanceAt = parseOptionalDate(body.nextMaintenanceAt);
  }
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.retiredAt !== undefined) updates.retiredAt = parseOptionalDate(body.retiredAt);

  if (body.action === "assign") {
    updates.status = "operational";
    updates.retiredAt = null;
  }
  if (body.action === "schedule_maintenance") {
    updates.status = "maintenance";
    updates.retiredAt = null;
    if (!updates.nextMaintenanceAt) {
      updates.nextMaintenanceAt = new Date(Date.now() + 7 * 86400000);
    }
  }
  if (body.action === "mark_damaged") {
    updates.status = "down";
    updates.retiredAt = null;
  }
  if (body.action === "retire") {
    updates.status = "down";
    updates.retiredAt = new Date();
  }
  if (body.action === "restore") {
    updates.status = "operational";
    updates.retiredAt = null;
  }

  const [row] = await db.update(assets).set(updates).where(eq(assets.id, id)).returning();
  await writeAudit(session, body.action ? `asset.${body.action}` : "asset.updated", "asset", id);
  return apiOk({ asset: row });
}
