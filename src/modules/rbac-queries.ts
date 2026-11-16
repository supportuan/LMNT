import { and, asc, count, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { orgRolePermissions, orgRoles, roleAssignments, type AccessScope } from "@/db/schema";
import { PERMISSION_CATALOG } from "@/lib/rbac/catalog";
import { ROLE_PERMISSIONS, type AppRole, type Permission } from "@/lib/permissions";
import type { SessionPayload } from "@/lib/session";
import { writeAudit } from "@/lib/audit";

const LEGACY_LABELS: Record<string, { name: string; description: string; sortOrder: number }> = {
  admin: { name: "Admin", description: "Full organisation access (migrated)", sortOrder: 10 },
  centre_manager: { name: "Centre manager", description: "Centre operations (migrated)", sortOrder: 20 },
  trainer: { name: "Trainer", description: "Coach operating system (migrated)", sortOrder: 30 },
  client: { name: "Client", description: "Member portal (migrated)", sortOrder: 40 },
};

/** One-time-per-org bridge: materialize org roles from existing assignments (not hardcoded seeds). */
export async function bridgeLegacyRolesForOrganisation(organisationId: string) {
  const distinct = await db
    .selectDistinct({ role: roleAssignments.role })
    .from(roleAssignments)
    .where(eq(roleAssignments.organisationId, organisationId));

  for (const { role } of distinct) {
    const meta = LEGACY_LABELS[role] ?? {
      name: role.replace(/_/g, " "),
      description: "Migrated from existing assignment",
      sortOrder: 100,
    };

    const [existing] = await db
      .select()
      .from(orgRoles)
      .where(and(eq(orgRoles.organisationId, organisationId), eq(orgRoles.legacyKey, role)))
      .limit(1);

    let roleId = existing?.id;
    if (!existing) {
      try {
        const [created] = await db
          .insert(orgRoles)
          .values({
            organisationId,
            name: meta.name,
            description: meta.description,
            legacyKey: role,
            sortOrder: meta.sortOrder,
            active: true,
          })
          .returning();
        roleId = created?.id;
      } catch {
        const [again] = await db
          .select()
          .from(orgRoles)
          .where(and(eq(orgRoles.organisationId, organisationId), eq(orgRoles.legacyKey, role)))
          .limit(1);
        roleId = again?.id;
      }
    }

    if (!roleId) continue;

    const perms = ROLE_PERMISSIONS[role as AppRole] ?? [];
    if (perms.length > 0) {
      const current = await db
        .select({ permission: orgRolePermissions.permission })
        .from(orgRolePermissions)
        .where(eq(orgRolePermissions.orgRoleId, roleId));
      if (current.length === 0) {
        const defaults = new Map(PERMISSION_CATALOG.map((p) => [p.key, p.defaultScope]));
        await db.insert(orgRolePermissions).values(
          perms.map((permission) => ({
            organisationId,
            orgRoleId: roleId!,
            permission,
            scope: (defaults.get(permission) ?? "organisation") as AccessScope,
          })),
        );
      }
    }

    await db
      .update(roleAssignments)
      .set({ orgRoleId: roleId })
      .where(
        and(
          eq(roleAssignments.organisationId, organisationId),
          eq(roleAssignments.role, role as AppRole),
          isNull(roleAssignments.orgRoleId),
        ),
      );
  }
}

export async function resolvePermissionsForSession(input: {
  userId: string;
  organisationId: string;
  activeRole: AppRole;
}): Promise<Permission[]> {
  await bridgeLegacyRolesForOrganisation(input.organisationId);

  const rows = await db
    .select({ permission: orgRolePermissions.permission })
    .from(roleAssignments)
    .innerJoin(orgRoles, eq(orgRoles.id, roleAssignments.orgRoleId))
    .innerJoin(orgRolePermissions, eq(orgRolePermissions.orgRoleId, orgRoles.id))
    .where(
      and(
        eq(roleAssignments.userId, input.userId),
        eq(roleAssignments.organisationId, input.organisationId),
        eq(roleAssignments.active, true),
        eq(orgRoles.active, true),
        or(eq(roleAssignments.role, input.activeRole), eq(orgRoles.legacyKey, input.activeRole)),
        or(isNull(roleAssignments.startsAt), sql`${roleAssignments.startsAt} <= now()`),
        or(isNull(roleAssignments.endsAt), sql`${roleAssignments.endsAt} > now()`),
      ),
    );

  if (rows.length > 0) {
    return [...new Set(rows.map((r) => r.permission))] as Permission[];
  }

  return ROLE_PERMISSIONS[input.activeRole] ?? [];
}

export type OrgRoleListItem = {
  id: string;
  name: string;
  description: string | null;
  legacyKey: string | null;
  active: boolean;
  sortOrder: number;
  permissionCount: number;
  assignmentCount: number;
  permissions: { permission: string; scope: AccessScope }[];
};

export async function listOrgRoles(session: SessionPayload): Promise<OrgRoleListItem[]> {
  await bridgeLegacyRolesForOrganisation(session.organisationId);

  const roles = await db
    .select()
    .from(orgRoles)
    .where(eq(orgRoles.organisationId, session.organisationId))
    .orderBy(asc(orgRoles.sortOrder), asc(orgRoles.name));

  if (roles.length === 0) return [];

  const roleIds = roles.map((r) => r.id);
  const [perms, assignmentCounts] = await Promise.all([
    db
      .select({
        orgRoleId: orgRolePermissions.orgRoleId,
        permission: orgRolePermissions.permission,
        scope: orgRolePermissions.scope,
      })
      .from(orgRolePermissions)
      .where(inArray(orgRolePermissions.orgRoleId, roleIds)),
    db
      .select({ orgRoleId: roleAssignments.orgRoleId, n: count() })
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.organisationId, session.organisationId),
          inArray(roleAssignments.orgRoleId, roleIds),
        ),
      )
      .groupBy(roleAssignments.orgRoleId),
  ]);

  const permMap = new Map<string, { permission: string; scope: AccessScope }[]>();
  for (const p of perms) {
    const list = permMap.get(p.orgRoleId) ?? [];
    list.push({ permission: p.permission, scope: p.scope });
    permMap.set(p.orgRoleId, list);
  }
  const countMap = new Map(
    assignmentCounts.filter((a) => a.orgRoleId).map((a) => [a.orgRoleId!, Number(a.n)]),
  );

  return roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    legacyKey: r.legacyKey,
    active: r.active,
    sortOrder: r.sortOrder,
    permissionCount: permMap.get(r.id)?.length ?? 0,
    assignmentCount: countMap.get(r.id) ?? 0,
    permissions: permMap.get(r.id) ?? [],
  }));
}

export async function createOrgRole(
  session: SessionPayload,
  input: { name: string; description?: string; duplicateFromId?: string },
) {
  const name = input.name.trim();
  if (!name) throw new Error("Role name is required");

  const [created] = await db
    .insert(orgRoles)
    .values({
      organisationId: session.organisationId,
      name,
      description: input.description?.trim() || null,
      legacyKey: null,
      active: true,
      sortOrder: 200,
    })
    .returning();

  if (input.duplicateFromId) {
    const source = await db
      .select()
      .from(orgRolePermissions)
      .where(
        and(
          eq(orgRolePermissions.orgRoleId, input.duplicateFromId),
          eq(orgRolePermissions.organisationId, session.organisationId),
        ),
      );
    if (source.length > 0) {
      await db.insert(orgRolePermissions).values(
        source.map((p) => ({
          organisationId: session.organisationId,
          orgRoleId: created.id,
          permission: p.permission,
          scope: p.scope,
        })),
      );
    }
  }

  await writeAudit(session, "org_role.created", "org_role", created.id, {
    name: created.name,
    duplicateFromId: input.duplicateFromId ?? null,
  });

  return created;
}

export async function updateOrgRole(
  session: SessionPayload,
  roleId: string,
  input: { name?: string; description?: string | null; active?: boolean; sortOrder?: number },
) {
  const [role] = await db
    .select()
    .from(orgRoles)
    .where(and(eq(orgRoles.id, roleId), eq(orgRoles.organisationId, session.organisationId)))
    .limit(1);
  if (!role) throw new Error("Role not found");

  const [updated] = await db
    .update(orgRoles)
    .set({
      name: input.name?.trim() ?? role.name,
      description: input.description === undefined ? role.description : input.description,
      active: input.active ?? role.active,
      sortOrder: input.sortOrder ?? role.sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(orgRoles.id, roleId))
    .returning();

  await writeAudit(session, "org_role.updated", "org_role", roleId, input);
  return updated;
}

export async function deleteOrgRole(session: SessionPayload, roleId: string) {
  const [role] = await db
    .select()
    .from(orgRoles)
    .where(and(eq(orgRoles.id, roleId), eq(orgRoles.organisationId, session.organisationId)))
    .limit(1);
  if (!role) throw new Error("Role not found");

  const [{ n }] = await db
    .select({ n: count() })
    .from(roleAssignments)
    .where(eq(roleAssignments.orgRoleId, roleId));
  if (Number(n) > 0) throw new Error("Role still has user assignments — reassign users first");

  await db.delete(orgRoles).where(eq(orgRoles.id, roleId));
  await writeAudit(session, "org_role.deleted", "org_role", roleId, { name: role.name });
}

export async function setOrgRolePermissions(
  session: SessionPayload,
  roleId: string,
  permissions: { permission: string; scope: AccessScope }[],
) {
  const [role] = await db
    .select()
    .from(orgRoles)
    .where(and(eq(orgRoles.id, roleId), eq(orgRoles.organisationId, session.organisationId)))
    .limit(1);
  if (!role) throw new Error("Role not found");

  // Least privilege: cannot grant permissions the actor does not hold
  const actorPerms = new Set(
    session.permissions?.length
      ? session.permissions
      : ROLE_PERMISSIONS[session.activeRole] ?? [],
  );
  for (const p of permissions) {
    if (!PERMISSION_CATALOG.some((c) => c.key === p.permission)) {
      throw new Error(`Unknown permission: ${p.permission}`);
    }
    if (!actorPerms.has(p.permission as Permission)) {
      throw new Error(`Cannot grant permission you do not hold: ${p.permission}`);
    }
  }

  await db.delete(orgRolePermissions).where(eq(orgRolePermissions.orgRoleId, roleId));
  if (permissions.length > 0) {
    await db.insert(orgRolePermissions).values(
      permissions.map((p) => ({
        organisationId: session.organisationId,
        orgRoleId: roleId,
        permission: p.permission,
        scope: p.scope,
      })),
    );
  }

  await writeAudit(session, "org_role.permissions_set", "org_role", roleId, {
    count: permissions.length,
  });
}
