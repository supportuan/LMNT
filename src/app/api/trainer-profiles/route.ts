import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { trainerProfiles } from "@/db/schema";
import { apiError, apiOk, centreIdForSession, requireApiSession } from "@/lib/api-helpers";
import { PERMISSIONS } from "@/lib/permissions";

const patchSchema = z.object({
  bio: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  sessionsPerWeek: z.string().optional(),
  marketplaceVisible: z.boolean().optional(),
});

export async function GET() {
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const [profile] = await db
    .select()
    .from(trainerProfiles)
    .where(eq(trainerProfiles.userId, session.userId))
    .limit(1);

  return apiOk({ profile: profile ?? null });
}

export async function PATCH(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);
  if (session.activeRole !== "trainer" && session.activeRole !== "admin") {
    return apiError("Forbidden", 403);
  }

  const body = patchSchema.parse(await request.json());
  const centreId = centreIdForSession(session);

  const [existing] = await db
    .select()
    .from(trainerProfiles)
    .where(eq(trainerProfiles.userId, session.userId))
    .limit(1);

  if (existing) {
    await db
      .update(trainerProfiles)
      .set({
        bio: body.bio ?? existing.bio,
        specialties: body.specialties ?? existing.specialties,
        sessionsPerWeek: body.sessionsPerWeek ?? existing.sessionsPerWeek,
        marketplaceVisible: body.marketplaceVisible ?? existing.marketplaceVisible,
        updatedAt: new Date(),
      })
      .where(eq(trainerProfiles.userId, session.userId));
  } else {
    await db.insert(trainerProfiles).values({
      userId: session.userId,
      organisationId: session.organisationId,
      centreId,
      bio: body.bio,
      specialties: body.specialties ?? [],
      sessionsPerWeek: body.sessionsPerWeek,
      marketplaceVisible: body.marketplaceVisible ?? true,
    });
  }

  return apiOk({});
}
