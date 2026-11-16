import { redirect } from "next/navigation";
import { RolesManager } from "@/components/settings/roles-manager";
import { PageHeader } from "@/components/ui";
import { PERMISSIONS } from "@/lib/permissions";
import { canAccessModuleForSession, getRoleHome } from "@/lib/policy";
import { ACCESS_SCOPES, permissionGroups } from "@/lib/rbac/catalog";
import { sessionHasPermission } from "@/lib/rbac/authorize";
import { getSession } from "@/lib/session";
import { listOrgRoles } from "@/modules/rbac-queries";

export default async function RolesSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModuleForSession(session, "roles") && !sessionHasPermission(session, PERMISSIONS.ROLE_MANAGE)) {
    redirect(getRoleHome(session.activeRole));
  }

  const roles = await listOrgRoles(session);

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        description="Create organisation roles and assign permissions. Role names are labels only — access is permission-driven."
      />
      <RolesManager initialRoles={roles} catalog={permissionGroups()} scopes={ACCESS_SCOPES} />
    </>
  );
}
