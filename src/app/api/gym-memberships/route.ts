import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { gymMemberships, members } from "@/db/schema";
import { assertMemberAccess } from "@/lib/access";
import { apiError, apiOk, requireApiSession, resolveCentreId } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { memberInScope } from "@/lib/branch-scope";
import {
  GYM_PACK_MONTHS,
  addMonthsUTC,
  gymMembershipDisplayStatus,
  packLabel,
} from "@/lib/gym-membership";
import { PERMISSIONS } from "@/lib/permissions";

const createSchema = z.object({
  memberId: z.string().uuid(),
  packMonths: z.union([z.literal(3), z.literal(6), z.literal(12), z.literal(24)]),
  startsAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  endsAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  status: z.enum(["active", "inactive", "paused"]).optional(),
  centreId: z.string().uuid().optional(),
});

const patchSchema = z.object({
  membershipId: z.string().uuid(),
  packMonths: z.union([z.literal(3), z.literal(6), z.literal(12), z.literal(24)]).optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  status: z.enum(["active", "inactive", "paused", "expired"]).optional(),
});

function parseStart(value: string) {
  if (value.length === 10) return new Date(`${value}T00:00:00.000Z`);
  return new Date(value);
}

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_CREATE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiError(err.issues.map((i) => i.message).join("; "), 400);
    }
    throw err;
  }

  if (!GYM_PACK_MONTHS.includes(body.packMonths)) {
    return apiError("Pack type must be 3, 6, 12, or 24 months", 400);
  }

  const [member] = await db
    .select({
      id: members.id,
      organisationId: members.organisationId,
      centreId: members.centreId,
    })
    .from(members)
    .where(eq(members.id, body.memberId))
    .limit(1);

  if (!member || member.organisationId !== session.organisationId || !memberInScope(session, member.centreId)) {
    return apiError("Member not found", 404);
  }

  const centreId = resolveCentreId(session, body.centreId) ?? member.centreId;
  const startsAt = parseStart(body.startsAt);
  const endsAt = body.endsAt ? parseStart(body.endsAt) : addMonthsUTC(startsAt, body.packMonths);
  if (endsAt.getTime() <= startsAt.getTime()) {
    return apiError("End date must be after start date", 400);
  }

  const status = body.status ?? (startsAt.getTime() > Date.now() ? "inactive" : "active");

  await db
    .update(gymMemberships)
    .set({ status: "expired", updatedAt: new Date() })
    .where(and(eq(gymMemberships.memberId, member.id), eq(gymMemberships.status, "active")));

  const [row] = await db
    .insert(gymMemberships)
    .values({
      organisationId: member.organisationId,
      centreId,
      memberId: member.id,
      packMonths: body.packMonths,
      startsAt,
      endsAt,
      status,
    })
    .returning();

  if (status === "paused") {
    await db
      .update(members)
      .set({ status: "paused", updatedAt: new Date() })
      .where(eq(members.id, member.id));
  }

  const display = gymMembershipDisplayStatus(row.status, row.endsAt);
  await writeAudit(session, "gym_membership.created", "gym_membership", row.id, {
    memberId: member.id,
    packMonths: body.packMonths,
  });

  return apiOk({
    membership: row,
    packCreated: true,
    displayStatus: display,
    message: `Pack created — ${display} (${packLabel(body.packMonths)})`,
  });
}

export async function PATCH(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_EDIT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = patchSchema.parse(await request.json());

  const [existing] = await db
    .select()
    .from(gymMemberships)
    .where(eq(gymMemberships.id, body.membershipId))
    .limit(1);

  if (!existing || existing.organisationId !== session.organisationId) {
    return apiError("Membership not found", 404);
  }

  try {
    await assertMemberAccess(session, existing.memberId);
  } catch {
    return apiError("Membership not found", 404);
  }

  const updates: Partial<typeof gymMemberships.$inferInsert> = { updatedAt: new Date() };
  if (body.packMonths) updates.packMonths = body.packMonths;
  if (body.startsAt) updates.startsAt = parseStart(body.startsAt);
  if (body.endsAt) updates.endsAt = parseStart(body.endsAt);
  if (body.status) updates.status = body.status;

  if (body.packMonths && !body.endsAt && body.startsAt) {
    updates.endsAt = addMonthsUTC(parseStart(body.startsAt), body.packMonths);
  }

  const [row] = await db
    .update(gymMemberships)
    .set(updates)
    .where(eq(gymMemberships.id, body.membershipId))
    .returning();

  if (body.status === "paused") {
    await db
      .update(members)
      .set({ status: "paused", updatedAt: new Date() })
      .where(eq(members.id, row.memberId));
  } else if (body.status === "active") {
    await db
      .update(members)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(members.id, row.memberId));
  }

  const display = gymMembershipDisplayStatus(row.status, row.endsAt);
  await writeAudit(session, "gym_membership.updated", "gym_membership", row.id);

  return apiOk({ membership: row, displayStatus: display });
}

export async function GET(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const memberId = new URL(request.url).searchParams.get("memberId");
  if (!memberId) return apiError("memberId required", 400);

  try {
    await assertMemberAccess(session, memberId);
  } catch {
    return apiError("Not found", 404);
  }

  const [row] = await db
    .select()
    .from(gymMemberships)
    .where(eq(gymMemberships.memberId, memberId))
    .orderBy(desc(gymMemberships.createdAt))
    .limit(1);

  if (!row) return apiOk({ membership: null });

  return apiOk({
    membership: row,
    displayStatus: gymMembershipDisplayStatus(row.status, row.endsAt),
  });
}