import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { serviceAgreements } from "@/db/schema";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { transitionAgreement, InvalidStateTransitionError } from "@/lib/community/agreement-service";
import { PERMISSIONS } from "@/lib/permissions";

const patchSchema = z.object({
  status: z.enum(["draft", "active", "paused", "terminated"]).optional(),
  title: z.string().min(1).optional(),
  terms: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireApiSession(PERMISSIONS.PARTNER_MANAGE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const { id } = await params;
  const body = patchSchema.parse(await request.json());

  const [agreement] = await db
    .select()
    .from(serviceAgreements)
    .where(
      and(eq(serviceAgreements.id, id), eq(serviceAgreements.organisationId, session.organisationId)),
    )
    .limit(1);

  if (!agreement) return apiError("Not found", 404);

  if (body.status && body.status !== agreement.status) {
    try {
      const updated = await db.transaction(async (tx) =>
        transitionAgreement(tx, {
          agreementId: agreement.id,
          organisationId: session.organisationId,
          from: agreement.status,
          to: body.status!,
          actorId: session.userId,
        }),
      );
      return apiOk({ agreement: updated });
    } catch (e) {
      if (e instanceof InvalidStateTransitionError) return apiError(e.message, 400);
      throw e;
    }
  }

  const [updated] = await db
    .update(serviceAgreements)
    .set({
      title: body.title ?? agreement.title,
      terms: body.terms ?? agreement.terms,
      updatedAt: new Date(),
    })
    .where(eq(serviceAgreements.id, id))
    .returning();

  return apiOk({ agreement: updated });
}
