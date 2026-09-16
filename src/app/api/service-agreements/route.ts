import { z } from "zod";
import { db } from "@/db";
import { partners, serviceAgreements } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/permissions";
import { getServiceAgreements } from "@/modules/community-queries";

const createSchema = z.object({
  partnerId: z.string().uuid(),
  centreId: z.string().uuid().optional(),
  title: z.string().min(1),
  terms: z.string().optional(),
  startsAt: z.string().datetime().optional(),
});

export async function GET() {
  const { error, session } = await requireApiSession(PERMISSIONS.PARTNER_MANAGE);
  if (error || !session) return error;

  const agreements = await getServiceAgreements(session);
  return apiOk({ agreements });
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

  const [agreement] = await db
    .insert(serviceAgreements)
    .values({
      organisationId: session.organisationId,
      centreId: body.centreId,
      partnerId: body.partnerId,
      title: body.title,
      terms: body.terms,
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      createdBy: session.userId,
      status: "draft",
    })
    .returning();

  await writeAudit(session, "service_agreement.created", "service_agreement", agreement.id);
  return apiOk({ agreement });
}
