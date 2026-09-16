import { redirect } from "next/navigation";
import { AddStaffForm } from "@/components/operations/add-staff-form";
import { SetPasswordButton } from "@/components/operations/set-password-button";
import { StaffBranchFilter } from "@/components/staff-branch-filter";
import { Badge, DataTable, PageHeader, Panel } from "@/components/ui";
import { formatInr } from "@/lib/format";
import { canAccessModule, hasPermission, PERMISSIONS } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getTrainerDesk } from "@/modules/admin-queries";
import { getCentreStaff, getCentresForSession, getStaffBranchSummaries } from "@/modules/queries";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string; role?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "staff")) redirect("/login");

  const params = await searchParams;
  const isAdmin = session.activeRole === "admin";
  const branch =
    params.branch ?? (isAdmin ? session.activeCentreId ?? "all" : "all");
  const role = params.role ?? (isAdmin ? "trainer" : "all");

  const [staff, summaries, centreRows] = await Promise.all([
    getCentreStaff(session, { branch, role }),
    getStaffBranchSummaries(session),
    getCentresForSession(session),
  ]);

  const canSetPassword = hasPermission(session.activeRole, PERMISSIONS.USER_MANAGE);
  const trainerIds = [...new Set(staff.filter((row) => row.role === "trainer").map((row) => row.userId))];
  const desk = await getTrainerDesk(session, trainerIds);
  const centreNames = Object.fromEntries(centreRows.map((c) => [c.id, c.name]));

  const branchLabel =
    branch === "all"
      ? "all branches"
      : branch === "org"
        ? "organisation-wide"
        : (centreNames[branch] ?? "this branch");

  return (
    <>
      <PageHeader
        title={isAdmin ? "Trainers" : "Staff management"}
        description={
          isAdmin
            ? `Availability, assigned clients, sessions, revenue, and performance across ${branchLabel}.`
            : `Trainers and centre managers across your organisation. Showing ${staff.length} staff for ${branchLabel}.`
        }
        action={
          session.activeRole === "admin" || session.activeRole === "centre_manager" ? (
            <AddStaffForm
              centres={centreRows.map((c) => ({ id: c.id, name: c.name }))}
              allowedRoles={
                session.activeRole === "admin"
                  ? [
                      { value: "trainer", label: "Trainer" },
                      { value: "centre_manager", label: "Centre manager" },
                    ]
                  : [{ value: "trainer", label: "Trainer" }]
              }
            />
          ) : undefined
        }
      />

      <StaffBranchFilter
        branch={branch}
        role={role}
        branches={summaries.branches}
        orgWide={summaries.orgWide}
        totals={summaries.totals}
        switchWorkspace={isAdmin}
      />

      {staff.length === 0 ? (
        <Panel>
          <p className="text-sm text-[var(--workspace-muted)]">
            No staff match this branch and role filter.
          </p>
        </Panel>
      ) : (
        <DataTable
          headers={
            isAdmin
              ? ["Trainer", "Availability", "Clients", "Sessions", "Revenue", "Performance", "Status", ""]
              : ["Name", "Email", "Role", "Branch", "Status", ""]
          }
          rows={staff.map((row) => {
            const stats = desk.get(row.userId);
            const branchName = row.centreId
              ? (centreNames[row.centreId] ?? session.centreNames[row.centreId] ?? "—")
              : "Organisation";
            const passwordAction =
              canSetPassword && row.userId !== session.userId ? (
                <SetPasswordButton key={`${row.id}-pw`} userId={row.userId} userName={row.userName} />
              ) : (
                ""
              );
            if (!isAdmin) {
              return [
                row.userName,
                row.userEmail,
                row.role.replace("_", " "),
                branchName,
                <Badge key={row.id} tone={row.userStatus === "active" ? "success" : "neutral"}>
                  {row.userStatus}
                </Badge>,
                passwordAction,
              ];
            }
            return [
              <div key={row.id}>
                <div className="font-medium">{row.userName}</div>
                <div className="text-[11px] text-[var(--workspace-muted)]">
                  {row.userEmail} · {branchName}
                </div>
              </div>,
              stats?.availability ?? "—",
              stats?.clients ?? 0,
              stats?.sessions30d ?? 0,
              formatInr(stats?.revenue ?? 0),
              `${stats?.performance ?? 0}% complete`,
              <Badge key={`${row.id}-status`} tone={row.userStatus === "active" ? "success" : "neutral"}>
                {row.userStatus}
              </Badge>,
              passwordAction,
            ];
          })}
        />
      )}
    </>
  );
}
