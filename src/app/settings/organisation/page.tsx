import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/change-password-form";
import { BranchesAdmin } from "@/components/admin/branches-admin";
import { OrgPackagesAdmin } from "@/components/admin/org-packages-admin";
import { Badge, DataTable, PageHeader, Panel } from "@/components/ui";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { workspaceCentreLabel } from "@/lib/branch-scope";
import { getSession } from "@/lib/session";
import { getOrgProfile } from "@/modules/admin-queries";
import { getOrganisationSettings } from "@/modules/queries";
import { getOrgPackages } from "@/modules/sales-queries";

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
  const timezone = settings.centres[0]?.timezone ?? "Asia/Kolkata";

  return (
    <>
      <PageHeader
        title="Settings"
        description="Gym profile, admin users, notifications, payment settings, and system."
      />

      <Panel title="Gym profile">
        <DataTable
          headers={["Field", "Value"]}
          rows={[
            ["Name", org?.name ?? session.organisationName],
            ["Slug", org?.slug ?? "—"],
            ["Status", org?.status ?? "active"],
            ["Scope", workspaceCentreLabel(session)],
          ]}
        />
      </Panel>

      <div className="mt-6">
        <Panel title="Admin users">
          <DataTable
            headers={["User", "Email", "Role", "Branch"]}
            rows={admins.map((row) => [
              row.userName,
              row.userEmail,
              row.role.replace("_", " "),
              row.centreId ? (centreNames[row.centreId] ?? "All branches") : "All branches",
            ])}
          />
        </Panel>
      </div>

      <div className="mt-6 grid gap-[var(--grid-gutter)] lg:grid-cols-2">
        <Panel title="Notifications">
          <ul className="space-y-2 text-sm text-[var(--workspace-muted)]">
            <li>Membership expiry alerts — 14 days before end date</li>
            <li>Overdue payment reminders — daily digest to gym admins</li>
            <li>Asset maintenance due — when next service date arrives</li>
            <li>Session cancellations — posted to Recent Activity</li>
          </ul>
        </Panel>
        <Panel title="Payment settings">
          <DataTable
            headers={["Method", "Status"]}
            rows={[
              ["UPI", <Badge key="upi" tone="success">Enabled</Badge>],
              ["Card", <Badge key="card" tone="success">Enabled</Badge>],
              ["Cash", <Badge key="cash" tone="success">Enabled</Badge>],
              ["Bank transfer", <Badge key="bank" tone="info">Manual</Badge>],
            ]}
          />
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="System settings">
          <DataTable
            headers={["Setting", "Value"]}
            rows={[
              ["Timezone", timezone],
              ["Currency", "INR"],
              ["Date format", "DD MMM YYYY"],
              ["Asset status model", "Available / In use / Maintenance / Damaged"],
            ]}
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
        rows={settings.assignments.map((row) => [
          row.userName,
          row.userEmail,
          row.role.replace("_", " "),
          row.centreId ? (centreNames[row.centreId] ?? "All") : "All",
        ])}
      />
    </>
  );
}
