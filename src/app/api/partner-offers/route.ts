import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { partnerOffers, partners } from "@/db/schema";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { PERMISSIONS } from "@/lib/permissions";

const createSchema = z.object({
  partnerId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  memberPriceInr: z.number().int().min(0).optional(),
});

export async function GET(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.PARTNER_VIEW);
  if (error || !session) return error;

  const partnerId = new URL(request.url).searchParams.get("partnerId");
  const rows = await db
    .select()
    .from(partnerOffers)
    .where(
      partnerId
        ? and(
            eq(partnerOffers.organisationId, session.organisationId),
            eq(partnerOffers.partnerId, partnerId),
          )
        : eq(partnerOffers.organisationId, session.organisationId),
    );

  return apiOk({ offers: rows });
}

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.PARTNER_MANAGE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = createSchema.parse(await request.json());

  const [partner] = await db
    .select()
    .from(partners)
    .where(
      and(eq(partners.id, body.partnerId), eq(partners.organisationId, session.organisationId)),
    )
    .limit(1);

  if (!partner) return apiError("Partner not found", 404);

  const [offer] = await db
    .insert(partnerOffers)
    .values({
      organisationId: session.organisationId,
      partnerId: body.partnerId,
      title: body.title,
      description: body.description,
      memberPriceInr: body.memberPriceInr,
    })
    .returning();

  return apiOk({ offer });
}
