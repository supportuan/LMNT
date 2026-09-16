import { z } from "zod";
import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { apiError, apiOk, resolveCentreId, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/permissions";

const createSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  quantity: z.number().int().min(0).default(0),
  reorderLevel: z.number().int().min(0).default(5),
  unit: z.string().min(1).default("units"),
  centreId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.ORG_SETTINGS);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = createSchema.parse(await request.json());
  const centreId = resolveCentreId(session, body.centreId);
  if (!centreId) return apiError("Select a branch", 400);

  const [row] = await db
    .insert(inventoryItems)
    .values({
      organisationId: session.organisationId,
      centreId,
      name: body.name,
      sku: body.sku,
      quantity: body.quantity,
      reorderLevel: body.reorderLevel,
      unit: body.unit,
    })
    .returning();

  await writeAudit(session, "inventory.created", "inventory_item", row.id);
  return apiOk({ item: row });
}
