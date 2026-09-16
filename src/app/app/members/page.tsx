import Link from "next/link";
import { redirect } from "next/navigation";
import { NewClientForm } from "@/components/trainer/new-client-form";
import { Badge, DataTable, EmptyState, PageHeader, Panel } from "@/components/ui";
import { formatDate, formatInr } from "@/lib/format";
import { canAccessModule, getRoleHome, hasPermission, PERMISSIONS } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getCentreMembers, getCentresForSession } from "@/modules/queries";
import { getScheduleTrainers } from "@/modules/admin-queries";
import { getOrgPackages } from "@/modules/sales-queries";

function membershipLabel(member: {
  status: string;
  planStatus: string | null;
  planEndsAt: Date | null;
}) {
  if (member.status !== "active") return member.status;
  if (member.planStatus === "expired" || member.planStatus === "cancelled") return member.planStatus;
  if (member.planEndsAt && member.planEndsAt.getTime() <= Date.now() + 14 * 86400000) return "expiring";
  return member.planStatus ?? member.status;
}

function membershipTone(label: string) {
  if (label === "active") return "success" as const;
  if (label === "expiring") return "warning" as const;
  if (label === "expired" || label === "paused") return "danger" as const;
  return "neutral" as const;
}

export default async function MembersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.activeRole === "trainer") {
    redirect("/app/clients");
  }

  if (!canAccessModule(session.activeRole, "clients")) {
    redirect(getRoleHome(session.activeRole));
  }

  const [members, centres, packages, trainers] = await Promise.all([
    getCentreMembers(session),
    getCentresForSession(session),
    getOrgPackages(session),
    getScheduleTrainers(session),
  ]);
  const canCreate = hasPermission(session.activeRole, PERMISSIONS.CLIENT_CREATE);
  const orderedCentres = session.activeCentreId
    ? [...centres].sort((a, b) => Number(b.id === session.activeCentreId) - Number(a.id === session.activeCentreId))
    : centres;
  const workspaceName = session.activeCentreId
    ? session.centreNames[session.activeCentreId]
    : null;

  return (
    <>
      <PageHeader
        title="Members"
        description={
          workspaceName
            ? `Members at ${workspaceName} — membership status, trainer assignment, attendance, and payments.`
            : "Membership status, trainer assignment, attendance, and payments."
        }
        action={
          canCreate ? (
            <NewClientForm
              centres={orderedCentres}
              trainers={trainers}
              packages={packages.filter((pkg) => pkg.active).map((pkg) => ({
                name: pkg.name,
                sessionCount: pkg.sessionCount,
                priceInr: pkg.priceInr,
                trainerShareBps: pkg.trainerShareBps,
              }))}
              buttonLabel="Add member"
            />
          ) : undefined
        }
      />
      {members.length === 0 ? (
        <Panel>
          <EmptyState title="No members in scope" description="New members will appear here once they are added to a branch." />
        </Panel>
      ) : (
        <DataTable
          headers={["Member", "Membership", "Trainer", "Attendance", "Payments", "Profile"]}
          rows={members.map((m) => {
            const label = membershipLabel(m);
            return [
              <div key={m.id}>
                <Link href={`/app/clients/${m.id}`} className="font-medium hover:underline">
                  {m.name}
                </Link>
                <div className="text-[11px] text-[var(--workspace-muted)]">
                  {m.centreName} · {m.goal ?? "No goal"}
                </div>
              </div>,
              <div key={`${m.id}-plan`}>
                <Badge tone={membershipTone(label)}>{label}</Badge>
                <div className="mt-1 text-[11px] text-[var(--workspace-muted)]">
                  {m.planName ?? "No plan"}
                  {m.planEndsAt ? ` · ends ${formatDate(m.planEndsAt)}` : ""}
                </div>
              </div>,
              m.trainerName ?? "Unassigned",
              `${m.attendance30d} check-ins`,
              formatInr(m.amountDue) === "—" ? "Paid" : `${formatInr(m.amountDue)} due`,
              <Link key={`${m.id}-open`} href={`/app/clients/${m.id}`} className="text-[var(--workspace-accent)] hover:underline">
                Open
              </Link>,
            ];
          })}
        />
      )}
    </>
  );
}
