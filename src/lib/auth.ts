import bcrypt from "bcryptjs";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  centres,
  organisationMemberships,
  organisations,
  roleAssignments,
  users,
} from "@/db/schema";
import type { AppRole } from "@/lib/policy";
import { createSessionToken } from "@/lib/session";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export async function findUserByIdentifier(identifier: string) {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  const looksEmail = trimmed.includes("@");
  if (looksEmail) {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.email, trimmed.toLowerCase()))
      .limit(1);
    return row ?? null;
  }

  const digits = digitsOnly(trimmed);
  const [row] = await db
    .select()
    .from(users)
    .where(or(eq(users.phone, trimmed), eq(users.phone, digits), eq(users.phone, `+91${digits}`)))
    .limit(1);
  return row ?? null;
}

export async function authenticateUser(identifier: string, password: string) {
  const user = await findUserByIdentifier(identifier);
  if (!user || user.status !== "active") return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  const memberships = await db
    .select({
      organisationId: organisationMemberships.organisationId,
      organisationName: organisations.name,
    })
    .from(organisationMemberships)
    .innerJoin(organisations, eq(organisationMemberships.organisationId, organisations.id))
    .where(
      and(
        eq(organisationMemberships.userId, user.id),
        eq(organisationMemberships.status, "active"),
      ),
    );

  if (memberships.length === 0) return null;

  const organisationId = memberships[0].organisationId;
  const organisationName = memberships[0].organisationName;

  const assignments = await db
    .select()
    .from(roleAssignments)
    .where(
      and(
        eq(roleAssignments.userId, user.id),
        eq(roleAssignments.organisationId, organisationId),
      ),
    );

  if (assignments.length === 0) return null;

  const roles = [...new Set(assignments.map((a) => a.role))] as AppRole[];
  const centreIds = [
    ...new Set(assignments.map((a) => a.centreId).filter(Boolean)),
  ] as string[];

  const centreRows = await db
    .select()
    .from(centres)
    .where(eq(centres.organisationId, organisationId));

  const centreNames = Object.fromEntries(centreRows.map((c) => [c.id, c.name]));

  return {
    user,
    organisationId,
    organisationName,
    roles,
    centreIds,
    centreNames,
  };
}

export function roleForPortal(roles: AppRole[], portal?: string | null): AppRole | null {
  if (portal === "client") return roles.includes("client") ? "client" : null;
  if (portal === "admin") {
    if (roles.includes("admin")) return "admin";
    if (roles.includes("centre_manager")) return "centre_manager";
    return null;
  }
  if (portal === "trainer") return roles.includes("trainer") ? "trainer" : null;
  if (roles.includes("admin")) return "admin";
  if (roles.includes("centre_manager")) return "centre_manager";
  if (roles.includes("trainer")) return "trainer";
  if (roles.includes("client")) return "client";
  return null;
}

export async function bumpSessionVersion(userId: string) {
  await db
    .update(users)
    .set({ sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function buildSessionForRole(
  base: Awaited<ReturnType<typeof authenticateUser>>,
  activeRole: AppRole,
) {
  if (!base) return null;

  if (!base.roles.includes(activeRole)) {
    return null;
  }

  return createSessionToken({
    userId: base.user.id,
    email: base.user.email,
    name: base.user.name,
    organisationId: base.organisationId,
    organisationName: base.organisationName,
    activeRole,
    centreIds: base.centreIds,
    centreNames: base.centreNames,
    roles: base.roles,
    activeCentreId: null,
    sessionVersion: base.user.sessionVersion ?? 1,
  });
}
