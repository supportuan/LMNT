import Link from "next/link";
import { redirect } from "next/navigation";
import { AssignMembershipForm } from "@/components/admin/assign-membership-form";
import { AssignTrainerSelect } from "@/components/admin/assign-trainer-select";
import { OrgPackagesAdmin } from "@/components/admin/org-packages-admin";
import { RecordPaymentButton } from "@/components/trainer/record-payment-button";
import { Badge, DataTable, PageHeader, Panel, StatCard } from "@/components/ui";
import { workspaceCentreLabel } from "@/lib/branch-scope";
import { formatInr } from "@/lib/format";
import { canAccessModule, getRoleHome, hasPermission, PERMISSIONS } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { bpsToPercent, collectedInr } from "@/lib/trainer-share";
import { getScheduleTrainers } from "@/modules/admin-queries";
import { getCentreMembers, getCentresForSession, getMemberships } from "@/modules/queries";
import { getOrgPackages } from "@/modules/sales-queries";

export const dynamic = "force-dynamic";

export default async function MembershipsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "memberships")) redirect(getRoleHome(session.activeRole));

  const [plans, packages, members, trainers, centres] = await Promise.all([
    getMemberships(session),
    getOrgPackages(session),
    getCentreMembers(session),
    getScheduleTrainers(session),
    getCentresForSession(session),
  ]);
  const visibleCentres = session.activeCentreId
    ? centres.filter((centre) => centre.id === session.activeCentreId)
    : centres;
  const orderedCentres = session.activeCentreId
    ? visibleCentres
    : centres;
  const workspaceLabel = workspaceCentreLabel(session);
  const canManagePlans = hasPermission(session.activeRole, PERMISSIONS.ORG_SETTINGS);
  const canAssign = hasPermission(session.activeRole, PERMISSIONS.CLIENT_CREATE);
  const canEditTrainer = hasPermission(session.activeRole, PERMISSIONS.CLIENT_EDIT);
  const canCollect = hasPermission(session.activeRole, PERMISSIONS.OWN_REVENUE_VIEW);

  const active = plans.filter((p) => p.status === "active");
  const outstanding = plans.reduce((sum, p) => sum + p.amountDue, 0);
  const gymCollected = active.reduce((sum, p) => sum + collectedInr(p.packageValue, p.amountDue), 0);
  const trainerPayouts = active.reduce((sum, p) => sum + p.trainerRevenue, 0);

  const assignedCounts = new Map<string, number>();
  for (const plan of active) {
    assignedCounts.set(plan.planName, (assignedCounts.get(plan.planName) ?? 0) + 1);
  }

  const catalog = packages.map((pkg) => ({
    ...pkg,
    memberCount: assignedCounts.get(pkg.name) ?? 0,
  }));
  const activeCatalog = catalog.filter((pkg) => pkg.active);

  const revenueByTrainer = new Map<string, { name: string; members: number; collected: number; share: number }>();
  for (const plan of active) {
    const key = plan.trainerId ?? "unassigned";
    const current = revenueByTrainer.get(key) ?? {
      name: plan.trainerName ?? "Unassigned",
      members: 0,
      collected: 0,
      share: 0,
    };
    current.members += 1;
    current.collected += collectedInr(plan.packageValue, plan.amountDue);
    current.share += plan.trainerRevenue;
    revenueByTrainer.set(key, current);
  }

  return (
    <>
      <PageHeader
        title="Membership plans"
        description={`Catalog, trainer share, and assigned memberships for ${workspaceLabel}.`}
        action={
          canAssign ? (
            <AssignMembershipForm
              centres={orderedCentres}
              members={members.map((member) => ({ id: member.id, name: member.name, centreId: member.centreId }))}
              trainers={trainers}
              packages={activeCatalog.map((pkg) => ({
                id: pkg.id,
                name: pkg.name,
                sessionCount: pkg.sessionCount,
                priceInr: pkg.priceInr,
                trainerShareBps: pkg.trainerShareBps,
              }))}
            />
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-[var(--grid-gutter)] sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Plans" value={activeCatalog.length} hint={`${packages.length} in catalog`} accent />
        <StatCard label="Collected" value={formatInr(gymCollected)} hint="Gym package collections" />
        <StatCard label="Trainer payouts" value={formatInr(trainerPayouts)} hint="Share of collected" />
        <StatCard label="Outstanding" value={formatInr(outstanding)} />
      </div>

      {canManagePlans ? (
        <div className="mb-8">
          <OrgPackagesAdmin
            packages={catalog}
            title="Plan catalog"
            description="Edit price and trainer %. New assignments use these values. Change trainer on a membership below to route the share."
          />
        </div>
      ) : null}

      <div className="mb-8">
        <Panel title="Trainer revenue">
          <DataTable
            headers={["Trainer", "Members", "Collected", "Trainer share"]}
            rows={[...revenueByTrainer.values()]
              .sort((a, b) => b.share - a.share)
              .map((row) => [row.name, row.members, formatInr(row.collected), formatInr(row.share)])}
          />
        </Panel>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--workspace-muted)]">
        Assigned memberships · {workspaceLabel}
      </h2>
      <DataTable
        headers={["Member", "Plan", "Branch", "Trainer", "Sessions", "Value", "Trainer revenue", "Due", ""]}
        rows={plans.map((plan) => [
          <Link key={plan.id} href={`/app/clients/${plan.memberId}`} className="font-medium hover:text-[var(--workspace-accent)]">
            {plan.memberName}
          </Link>,
          plan.planName,
          plan.centreName,
          canEditTrainer && plan.status === "active" ? (
            <AssignTrainerSelect
              key={`${plan.id}-trainer`}
              memberId={plan.memberId}
              trainerId={plan.trainerId}
              trainers={trainers}
            />
          ) : (
            plan.trainerName ?? "Unassigned"
          ),
          `${plan.sessionsRemaining}/${plan.totalSessions}`,
          formatInr(plan.packageValue),
          plan.trainerId
            ? `${formatInr(plan.trainerRevenue)} · ${bpsToPercent(plan.trainerShareBps)}%`
            : "—",
          formatInr(plan.amountDue),
          plan.status === "active" && plan.amountDue > 0 && canCollect ? (
            <RecordPaymentButton
              key={`${plan.id}-pay`}
              planId={plan.id}
              amountDue={plan.amountDue}
              memberName={plan.memberName}
            />
          ) : (
            <Badge
              key={`${plan.id}-status`}
              tone={plan.status === "active" ? "success" : plan.status === "expired" ? "warning" : "neutral"}
            >
              {plan.status}
            </Badge>
          ),
        ])}
      />
    </>
  );
}
