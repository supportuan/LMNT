import { z } from "zod";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { apiError, apiOk, resolveCentreId, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { parseOptionalDate } from "@/lib/format";
import { PERMISSIONS } from "@/lib/permissions";

const optionalDate = z.string().nullable().optional();

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1).default("equipment"),
  serialNumber: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  purchaseDate: optionalDate,
  purchaseCost: z.number().int().nonnegative().nullable().optional(),
  status: z.enum(["operational", "down", "maintenance"]).default("operational"),
  assignedTrainerId: z.union([z.string().uuid(), z.literal(""), z.null()]).optional(),
  assignedArea: z.string().nullable().optional(),
  warrantyUntil: optionalDate,
  lastServiceAt: optionalDate,
  nextMaintenanceAt: optionalDate,
  notes: z.string().nullable().optional(),
  retiredAt: z.string().nullable().optional(),
  centreId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.ORG_SETTINGS);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = createSchema.parse(await request.json());
  const centreId = resolveCentreId(session, body.centreId);
  if (!centreId) return apiError("Select a branch", 400);

  const trainerId =
    body.assignedTrainerId && body.assignedTrainerId !== "" ? body.assignedTrainerId : null;

  const [row] = await db
    .insert(assets)
    .values({
      organisationId: session.organisationId,
      centreId,
      name: body.name,
      category: body.category,
      serialNumber: body.serialNumber || null,
      location: body.location || null,
      purchaseDate: parseOptionalDate(body.purchaseDate ?? null),
      purchaseCost: body.purchaseCost ?? null,
      status: body.status,
      assignedTrainerId: trainerId,
      assignedArea: body.assignedArea || null,
      warrantyUntil: parseOptionalDate(body.warrantyUntil ?? null),
      lastServiceAt: parseOptionalDate(body.lastServiceAt ?? null),
      nextMaintenanceAt: parseOptionalDate(body.nextMaintenanceAt ?? null),
      retiredAt: parseOptionalDate(body.retiredAt ?? null),
      notes: body.notes || null,
    })
    .returning();

  await writeAudit(session, "asset.created", "asset", row.id);
  return apiOk({ asset: row });
}
