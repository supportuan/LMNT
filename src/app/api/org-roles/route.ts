import { z } from "zod";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { PERMISSIONS } from "@/lib/permissions";
import { ACCESS_SCOPES, permissionGroups } from "@/lib/rbac/catalog";
import { createOrgRole, listOrgRoles } from "@/modules/rbac-queries";

export async function GET() {
  const { error, session } = await requireApiSession(PERMISSIONS.ROLE_MANAGE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const roles = await listOrgRoles(session);
  return apiOk({
    roles,
    catalog: permissionGroups(),
    scopes: ACCESS_SCOPES,
  });
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  duplicateFromId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.ROLE_MANAGE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await request.json());
  } catch (err) {
    return apiError(err instanceof z.ZodError ? err.issues.map((i) => i.message).join("; ") : "Invalid request", 400);
  }

  try {
    const role = await createOrgRole(session, body);
    const roles = await listOrgRoles(session);
    return apiOk({ role, roles });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Could not create role", 400);
  }
}
