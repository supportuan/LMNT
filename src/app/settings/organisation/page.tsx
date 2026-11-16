import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/change-password-form";
import { BranchesAdmin } from "@/components/admin/branches-admin";
import { OrgPackagesAdmin } from "@/components/admin/org-packages-admin";
import { DataTable, PageHeader, Panel } from "@/components/ui";
import { canAccessModule, getRoleHome, ROLE_LABELS, type AppRole } from "@/lib/policy";
import { workspaceCentreLabel } from "@/lib/branch-scope";
import { formatDate } from "@/lib/format";
import { getSession } from "@/lib/session";
import { getOrgProfile } from "@/modules/admin-queries";
import { getOrganisationSettings } from "@/modules/queries";
import { getOrgPackages } from "@/modules/sales-queries";

function roleLabel(role: string) {
  return ROLE_LABELS[role as AppRole] ?? role.replaceAll("_", " ");
}

export default async function OrganisationSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "organisation")) redirect(getRoleHome(session.activeRole));

  const [settings, packages, org] = await Promise.all([
    getOrganisationSettings(session),
    getOrgPackages(session),
    getOrgProfile(session),
  ]);

  const admins = settings.assignments.filter((row) => row.role === "admin");
  const centreNames = Object.fromEntries(settings.centres.map((centre) => [centre.id, centre.name]));
  const timezones = [...new Set(settings.centres.map((c) => c.timezone).filter(Boolean))];
  const activeBranches = settings.centres.filter((c) => c.status === "active").length;

  return (
    <>
      <PageHeader
        title="Organisation"
        description="Gym profile, branches, packages, and who has access."
      />

      <Panel title="Gym profile">
        <DataTable
          headers={["Field", "Value"]}
          rows={[
            ["Name", org?.name ?? session.organisationName],
            ["Slug", org?.slug ?? "—"],
            ["Status", org?.status ?? "active"],
            ["Branches", `${activeBranches} active · ${settings.centres.length} total`],
            ["Timezones", timezones.length ? timezones.join(", ") : "—"],
            ["Workspace scope", workspaceCentreLabel(session)],
            ["Created", formatDate(org?.createdAt)],
          ]}
        />
      </Panel>

      <div className="mt-6">
        <Panel title="Admin users">
          <DataTable
            headers={["User", "Email", "Role", "Branch"]}
            rows={
              admins.length
                ? admins.map((row) => [
                    row.userName,
                    row.userEmail,
                    roleLabel(row.role),
                    row.centreId ? (centreNames[row.centreId] ?? "All branches") : "All branches",
                  ])
                : [["—", "No admin assignments", "—", "—"]]
            }
          />
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Your password">
          <ChangePasswordForm />
        </Panel>
      </div>

      <div className="mt-8">
        <BranchesAdmin centres={settings.centres} />
      </div>

      <div className="mt-8">
        <OrgPackagesAdmin packages={packages} />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-[var(--workspace-muted)]">
        Role assignments
      </h2>
      <DataTable
        headers={["User", "Email", "Role", "Branch"]}
        rows={
          settings.assignments.length
            ? settings.assignments.map((row) => [
                row.userName,
                row.userEmail,
                roleLabel(row.role),
                row.centreId ? (centreNames[row.centreId] ?? "All") : "All",
              ])
            : [["—", "No role assignments", "—", "—"]]
        }
      />
    </>
  );
}
