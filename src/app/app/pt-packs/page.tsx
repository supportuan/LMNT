import Link from "next/link";
import { redirect } from "next/navigation";
import { PtPackActions } from "@/components/admin/pt-pack-actions";
import { PtPackForm } from "@/components/admin/pt-pack-form";
import { Badge, DataTable, PageHeader, Panel } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { canAccessModule, getRoleHome, hasPermission, PERMISSIONS } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getScheduleTrainers } from "@/modules/admin-queries";
import { getCentreMembers, getCentresForSession } from "@/modules/queries";
import { getOrgPackages } from "@/modules/sales-queries";
import { db } from "@/db";
import { memberPlans, members as membersTable, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { orgAndCentreScope } from "@/lib/branch-scope";

export const dynamic = "force-dynamic";

export default async function PtPacksPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "memberships")) redirect(getRoleHome(session.activeRole));
  if (!hasPermission(session.activeRole, PERMISSIONS.CLIENT_CREATE)) redirect(getRoleHome(session.activeRole));

  const [memberRows, trainers, centres, packages] = await Promise.all([
    getCentreMembers(session),
    getScheduleTrainers(session),
    getCentresForSession(session),
    getOrgPackages(session),
  ]);

  const plans = await db
    .select({
      id: memberPlans.id,
      memberId: memberPlans.memberId,
      memberName: membersTable.name,
      planName: memberPlans.planName,
      status: memberPlans.status,
      trainerName: users.name,
      trainingDays: memberPlans.trainingDays,
      trainingTime: memberPlans.trainingTime,
      startsAt: memberPlans.startsAt,
      endsAt: memberPlans.endsAt,
      sessionsRemaining: memberPlans.sessionsRemaining,
      totalSessions: memberPlans.totalSessions,
    })
    .from(memberPlans)
    .innerJoin(membersTable, eq(memberPlans.memberId, membersTable.id))
    .leftJoin(users, eq(memberPlans.trainerId, users.id))
    .where(orgAndCentreScope(session, memberPlans.organisationId, memberPlans.centreId))
    .orderBy(desc(memberPlans.createdAt))
    .limit(40);

  const activeCatalog = packages.filter((p) => p.active);

  return (
    <>
      <PageHeader
        title="PT packs"
        description="Screen 4 — create, renew, pause, and tag sessions on the trainer calendar."
      />

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Create / renew PT pack">
          <PtPackForm
            centres={centres}
            members={memberRows.map((m) => ({ id: m.id, name: m.name, centreId: m.centreId }))}
            trainers={trainers}
            packages={activeCatalog.map((p) => ({
              id: p.id,
              name: p.name,
              sessionCount: p.sessionCount,
              priceInr: p.priceInr,
            }))}
          />
        </Panel>
        <Panel title="Output">
          <p className="text-sm text-[var(--workspace-muted)]">
            Successful submit returns: <strong>PT pack created — sessions added to trainer calendar</strong>. Each
            pack spreads catalog sessions across the chosen days and time until pack end or session count is reached.
          </p>
        </Panel>
      </div>

      <Panel title="PT packs (sessions)">
        <DataTable
          headers={["Member", "Pack", "Trainer", "Validity", "Days", "Time", "Sessions", "Status", ""]}
          rows={plans.map((plan) => [
            <Link
              key={`${plan.id}-m`}
              href={`/app/clients/${plan.memberId}/package`}
              className="font-medium hover:text-[var(--workspace-accent)]"
            >
              {plan.memberName}
            </Link>,
            plan.planName,
            plan.trainerName ?? "—",
            `${formatDate(plan.startsAt)} → ${plan.endsAt ? formatDate(plan.endsAt) : "—"}`,
            plan.trainingDays ?? "—",
            plan.trainingTime ?? "—",
            `${plan.sessionsRemaining}/${plan.totalSessions}`,
            <Badge
              key={`${plan.id}-s`}
              tone={plan.status === "active" ? "success" : plan.status === "paused" ? "warning" : "neutral"}
            >
              {plan.status}
            </Badge>,
            <PtPackActions key={`${plan.id}-a`} planId={plan.id} status={plan.status} />,
          ])}
        />
      </Panel>
    </>
  );
}