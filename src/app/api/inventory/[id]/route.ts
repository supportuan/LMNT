import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/permissions";
import { withCentreScope } from "@/lib/branch-scope";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().nullable().optional(),
  quantity: z.number().int().min(0).optional(),
  reorderLevel: z.number().int().min(0).optional(),
  unit: z.string().min(1).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireApiSession(PERMISSIONS.ORG_SETTINGS);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const { id } = await params;
  const body = updateSchema.parse(await request.json());

  let condition = and(
    eq(inventoryItems.id, id),
    eq(inventoryItems.organisationId, session.organisationId),
  )!;
  condition = withCentreScope(session, condition, inventoryItems.centreId);

  const [existing] = await db
    .select({ id: inventoryItems.id })
    .from(inventoryItems)
    .where(condition)
    .limit(1);
  if (!existing) return apiError("Not found", 404);

  const updates: Partial<typeof inventoryItems.$inferInsert> = {};
  if (body.name) updates.name = body.name;
  if (body.sku !== undefined) updates.sku = body.sku;
  if (body.quantity !== undefined) updates.quantity = body.quantity;
  if (body.reorderLevel !== undefined) updates.reorderLevel = body.reorderLevel;
  if (body.unit) updates.unit = body.unit;

  const [row] = await db
    .update(inventoryItems)
    .set(updates)
    .where(eq(inventoryItems.id, id))
    .returning();

  await writeAudit(session, "inventory.updated", "inventory_item", id);
  return apiOk({ item: row });
}
