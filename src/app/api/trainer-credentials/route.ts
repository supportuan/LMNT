import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { trainerCredentials } from "@/db/schema";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/permissions";

const createSchema = z.object({
  trainerId: z.string().uuid(),
  label: z.string().min(1),
  issuer: z.string().optional(),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  verified: z.boolean(),
});

export async function GET(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.TRAINER_MANAGE);
  if (error || !session) return error;

  const trainerId = new URL(request.url).searchParams.get("trainerId");
  const rows = await db
    .select()
    .from(trainerCredentials)
    .where(
      trainerId
        ? and(
            eq(trainerCredentials.organisationId, session.organisationId),
            eq(trainerCredentials.trainerId, trainerId),
          )
        : eq(trainerCredentials.organisationId, session.organisationId),
    );

  return apiOk({ credentials: rows });
}

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.TRAINER_MANAGE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = createSchema.parse(await request.json());

  const [credential] = await db
    .insert(trainerCredentials)
    .values({
      organisationId: session.organisationId,
      trainerId: body.trainerId,
      label: body.label,
      issuer: body.issuer,
      verified: false,
    })
    .returning();

  await writeAudit(session, "trainer_credential.created", "trainer_credential", credential.id, {
    trainerId: body.trainerId,
  });
  return apiOk({ credential });
}

export async function PATCH(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.TRAINER_MANAGE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = patchSchema.parse(await request.json());

  const [existing] = await db
    .select()
    .from(trainerCredentials)
    .where(
      and(
        eq(trainerCredentials.id, body.id),
        eq(trainerCredentials.organisationId, session.organisationId),
      ),
    )
    .limit(1);

  if (!existing) return apiError("Not found", 404);

  const [credential] = await db
    .update(trainerCredentials)
    .set({
      verified: body.verified,
      verifiedAt: body.verified ? new Date() : null,
      verifiedBy: body.verified ? session.userId : null,
    })
    .where(eq(trainerCredentials.id, body.id))
    .returning();

  await writeAudit(session, "trainer_credential.verified", "trainer_credential", credential.id, {
    verified: body.verified,
  });
  return apiOk({ credential });
}
