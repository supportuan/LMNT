import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orgPackages } from "@/db/schema";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/permissions";
import { getOrgPackages } from "@/modules/sales-queries";

export async function GET() {
  const { error, session } = await requireApiSession(PERMISSIONS.ORG_SETTINGS);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const packages = await getOrgPackages(session);
  return apiOk({ packages });
}

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.ORG_SETTINGS);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = z
    .object({
      name: z.string().min(1),
      sessionCount: z.number().min(1),
      priceInr: z.number().min(0),
      trainerShareBps: z.number().int().min(0).max(10000).optional(),
      description: z.string().optional(),
    })
    .parse(await request.json());

  const [pkg] = await db
    .insert(orgPackages)
    .values({
      organisationId: session.organisationId,
      name: body.name,
      sessionCount: body.sessionCount,
      priceInr: body.priceInr,
      trainerShareBps: body.trainerShareBps,
      description: body.description,
    })
    .returning();

  await writeAudit(session, "org_package.created", "org_package", pkg.id);
  return apiOk({ package: pkg });
}

export async function PATCH(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.ORG_SETTINGS);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = z
    .object({
      id: z.string().uuid(),
      name: z.string().optional(),
      sessionCount: z.number().optional(),
      priceInr: z.number().optional(),
      trainerShareBps: z.number().int().min(0).max(10000).optional(),
      description: z.string().optional(),
      active: z.boolean().optional(),
    })
    .parse(await request.json());

  const updates: Partial<typeof orgPackages.$inferInsert> = { updatedAt: new Date() };
  if (body.name) updates.name = body.name;
  if (body.sessionCount) updates.sessionCount = body.sessionCount;
  if (body.priceInr !== undefined) updates.priceInr = body.priceInr;
  if (body.trainerShareBps !== undefined) updates.trainerShareBps = body.trainerShareBps;
  if (body.description !== undefined) updates.description = body.description;
  if (body.active !== undefined) updates.active = body.active;

  await db
    .update(orgPackages)
    .set(updates)
    .where(and(eq(orgPackages.id, body.id), eq(orgPackages.organisationId, session.organisationId)));

  await writeAudit(session, "org_package.updated", "org_package", body.id);
  return apiOk({});
}
