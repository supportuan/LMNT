import { z } from "zod";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import type { AccessScope } from "@/db/schema";
import { PERMISSIONS } from "@/lib/permissions";
import { ACCESS_SCOPES } from "@/lib/rbac/catalog";
import { deleteOrgRole, listOrgRoles, setOrgRolePermissions, updateOrgRole } from "@/modules/rbac-queries";

const scopeValues = ACCESS_SCOPES.map((s) => s.value) as [AccessScope, ...AccessScope[]];

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  permissions: z
    .array(
      z.object({
        permission: z.string().min(1).max(80),
        scope: z.enum(scopeValues),
      }),
    )
    .optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireApiSession(PERMISSIONS.ROLE_MANAGE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const { id } = await context.params;
  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await request.json());
  } catch (err) {
    return apiError(err instanceof z.ZodError ? err.issues.map((i) => i.message).join("; ") : "Invalid request", 400);
  }

  try {
    if (body.name !== undefined || body.description !== undefined || body.active !== undefined || body.sortOrder !== undefined) {
      await updateOrgRole(session, id, {
        name: body.name,
        description: body.description,
        active: body.active,
        sortOrder: body.sortOrder,
      });
    }
    if (body.permissions) {
      await setOrgRolePermissions(session, id, body.permissions);
    }
    const roles = await listOrgRoles(session);
    return apiOk({ roles });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Could not update role", 400);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireApiSession(PERMISSIONS.ROLE_MANAGE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const { id } = await context.params;
  try {
    await deleteOrgRole(session, id);
    const roles = await listOrgRoles(session);
    return apiOk({ roles });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Could not delete role", 400);
  }
}
