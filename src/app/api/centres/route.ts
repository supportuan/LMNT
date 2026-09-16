import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { centres } from "@/db/schema";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/permissions";
import { createSessionToken, setSessionCookie, type SessionPayload } from "@/lib/session";

function slugify(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "branch";
}

async function uniqueSlug(organisationId: string, name: string) {
  const base = slugify(name);
  let slug = base;
  let n = 2;
  while (true) {
    const [existing] = await db
      .select({ id: centres.id })
      .from(centres)
      .where(and(eq(centres.organisationId, organisationId), eq(centres.slug, slug)))
      .limit(1);
    if (!existing) return slug;
    slug = `${base}-${n}`;
    n += 1;
  }
}

async function refreshAdminCentres(session: SessionPayload) {
  if (session.activeRole !== "admin") return;
  const rows = await db
    .select({ id: centres.id, name: centres.name })
    .from(centres)
    .where(eq(centres.organisationId, session.organisationId));
  const centreNames = Object.fromEntries(rows.map((row) => [row.id, row.name]));
  const token = await createSessionToken({ ...session, centreNames });
  await setSessionCookie(token);
}

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.ORG_SETTINGS);
  if (error || !session) return error ?? apiError("Unauthorized", 401);
  if (session.activeRole !== "admin") return apiError("Only admin can add branches", 403);

  const body = z
    .object({
      name: z.string().min(1),
      capacity: z.number().int().min(1).max(10000).optional(),
      timezone: z.string().min(1).optional(),
    })
    .parse(await request.json());

  const slug = await uniqueSlug(session.organisationId, body.name);
  const [centre] = await db
    .insert(centres)
    .values({
      organisationId: session.organisationId,
      name: body.name.trim(),
      slug,
      capacity: body.capacity ?? 250,
      timezone: body.timezone ?? "Asia/Kolkata",
      status: "active",
    })
    .returning();

  await refreshAdminCentres(session);
  await writeAudit(session, "centre.created", "centre", centre.id, { slug });
  return apiOk({ centre });
}

export async function PATCH(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.ORG_SETTINGS);
  if (error || !session) return error ?? apiError("Unauthorized", 401);
  if (session.activeRole !== "admin") return apiError("Only admin can update branches", 403);

  const body = z
    .object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      capacity: z.number().int().min(1).max(10000).optional(),
      timezone: z.string().min(1).optional(),
      status: z.enum(["active", "inactive"]).optional(),
    })
    .parse(await request.json());

  const updates: Partial<typeof centres.$inferInsert> = { updatedAt: new Date() };
  if (body.name) updates.name = body.name.trim();
  if (body.capacity !== undefined) updates.capacity = body.capacity;
  if (body.timezone) updates.timezone = body.timezone;
  if (body.status) updates.status = body.status;

  const [centre] = await db
    .update(centres)
    .set(updates)
    .where(and(eq(centres.id, body.id), eq(centres.organisationId, session.organisationId)))
    .returning();

  if (!centre) return apiError("Branch not found", 404);

  await refreshAdminCentres(session);
  await writeAudit(session, "centre.updated", "centre", body.id);
  return apiOk({ centre });
}
