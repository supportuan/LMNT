import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { partners } from "@/db/schema";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { publishEvent } from "@/lib/domain/publish-event";
import { PERMISSIONS } from "@/lib/permissions";

const createSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["nutrition", "physio", "apparel", "wellness", "other"]).default("other"),
  centreId: z.string().uuid().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  description: z.string().optional(),
  commissionBps: z.number().int().min(0).max(10000).optional(),
});

export async function GET() {
  const { error, session } = await requireApiSession(PERMISSIONS.PARTNER_VIEW);
  if (error || !session) return error;

  const rows = await db
    .select()
    .from(partners)
    .where(eq(partners.organisationId, session.organisationId))
    .orderBy(desc(partners.updatedAt));

  return apiOk({ partners: rows });
}

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.PARTNER_MANAGE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = createSchema.parse(await request.json());

  if (
    session.activeRole === "centre_manager" &&
    body.centreId &&
    !session.centreIds.includes(body.centreId)
  ) {
    return apiError("Cannot add partners outside your branch", 403);
  }

  const partner = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(partners)
      .values({
        organisationId: session.organisationId,
        centreId: body.centreId,
        name: body.name,
        category: body.category,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        description: body.description,
        commissionBps: body.commissionBps ?? 0,
      })
      .returning();

    await publishEvent(tx, {
      organisationId: session.organisationId,
      type: "PartnerCreated",
      actorId: session.userId,
      entityType: "partner",
      entityId: row.id,
      payload: { name: row.name, category: row.category },
    });

    return row;
  });

  await writeAudit(session, "partner.created", "partner", partner.id);
  return apiOk({ partner });
}
