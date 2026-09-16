import Link from "next/link";
import { redirect } from "next/navigation";
import { AnalyticsTrendChart } from "@/components/dashboard/analytics-trend-chart";
import {
  KpiIconAssets,
  KpiIconSessions,
  KpiIconTrainers,
  KpiIconTrend,
  KpiIconUsers,
} from "@/components/dashboard/kpi-icons";
import { AttentionItem, Badge, PageHeader, Panel, StatCard } from "@/components/ui";
import { canAccessModule } from "@/lib/policy";
import { formatDate, formatInr } from "@/lib/format";
import { getSession } from "@/lib/session";
import { getAdminDashboard } from "@/modules/queries";
import { getAnalyticsTimeSeries } from "@/modules/sales-queries";
import { workspaceCentreLabel } from "@/lib/branch-scope";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function activityLabel(action: string) {
  return action.replace(/[._]/g, " ");
}

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "analytics")) redirect("/login");

  const [dash, trends] = await Promise.all([getAdminDashboard(session), getAnalyticsTimeSeries(session)]);

  const workspaceLabel = workspaceCentreLabel(session);
  const scopeLabel =
    session.activeRole === "centre_manager"
      ? "Branch operations at a glance — members, sessions, assets, and renewals."
      : session.activeCentreId
        ? `All KPIs, sessions, assets, and alerts are for ${workspaceLabel}.`
        : "All branches. Switch workspace to load a single branch dashboard.";

  return (
    <div key={session.activeCentreId ?? "all"}>
      <PageHeader
        title={session.activeCentreId ? `${workspaceLabel} dashboard` : "Dashboard"}
        description={scopeLabel}
      />

      <div className="mb-6 grid gap-[var(--grid-gutter)] sm:grid-cols-2 xl:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Total Members"
          value={dash.members}
          icon={<KpiIconUsers />}
          accent
          href={canAccessModule(session.activeRole, "members") ? "/app/members" : undefined}
        />
        <StatCard
          label="Active Trainers"
          value={dash.activeTrainers}
          icon={<KpiIconTrainers />}
          href={canAccessModule(session.activeRole, "staff") ? "/app/staff" : undefined}
        />
        <StatCard
          label="Today’s Sessions"
          value={dash.todaySessions}
          icon={<KpiIconSessions />}
          href={canAccessModule(session.activeRole, "sessions") ? "/app/sessions" : undefined}
        />
        <StatCard
          label="Monthly Revenue"
          value={formatInr(dash.monthlyRevenue)}
          icon={<KpiIconTrend />}
          accent
          href={canAccessModule(session.activeRole, "payments") ? "/app/payments" : undefined}
        />
        <StatCard
          label="Retention"
          value={`${dash.retentionRate}%`}
          hint="Package attachment"
          href={canAccessModule(session.activeRole, "memberships") ? "/app/memberships" : undefined}
        />
        <StatCard label="Adherence" value={`${dash.adherenceRate}%`} hint="Session completion (30d)" />
      </div>

      <div className="mb-6 grid gap-[var(--grid-gutter)] sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Assets" value={dash.assetOverview.total} icon={<KpiIconAssets />} />
        <StatCard label="In Use" value={dash.assetOverview.inUse} />
        <StatCard label="Available" value={dash.assetOverview.available} accent />
        <StatCard label="Under Maintenance" value={dash.assetOverview.maintenance} />
        <StatCard label="Damaged" value={dash.assetOverview.damaged} />
      </div>

      <div className="mb-6 grid gap-[var(--grid-gutter)] lg:grid-cols-[1.35fr_1fr]">
        <Panel title="Activity" action={<Badge tone="info">30 days</Badge>}>
          <AnalyticsTrendChart points={trends} />
        </Panel>

        <Panel title="Membership expiry alerts">
          {dash.expiryAlerts.length === 0 ? (
            <p className="text-sm text-[var(--workspace-muted)]">No memberships expiring in the next 14 days.</p>
          ) : (
            <div className="space-y-2.5">
              {dash.expiryAlerts.map((alert) => (
                <AttentionItem
                  key={alert.id}
                  tone={alert.endsAt && alert.endsAt.getTime() - Date.now() < 3 * 86400000 ? "danger" : "warning"}
                  title={alert.memberName}
                  detail={`${alert.planName} · ends ${formatDate(alert.endsAt)} · ${alert.sessionsRemaining} sessions left`}
                />
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-[var(--grid-gutter)] lg:grid-cols-2">
        <Panel
          title="Today’s sessions"
          action={
            <Link href="/app/sessions" className="text-sm font-medium text-[var(--workspace-accent)] hover:underline">
              View all
            </Link>
          }
        >
          {dash.todaySessionRows.length === 0 ? (
            <p className="text-sm text-[var(--workspace-muted)]">No sessions scheduled today.</p>
          ) : (
            <div className="space-y-2">
              {dash.todaySessionRows.map((row) => (
                <Link
                  key={row.id}
                  href={`/app/sessions/${row.id}`}
                  className="neu-inset flex items-center justify-between rounded-[12px] px-4 py-3 transition hover:bg-[var(--workspace-elevated)]"
                >
                  <div>
                    <div className="text-sm font-medium">{row.memberName}</div>
                    <div className="text-xs text-[var(--workspace-muted)]">
                      {row.scheduledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <Badge tone={row.status === "completed" ? "success" : row.status === "in_progress" ? "warning" : "info"}>
                    {row.status.replace("_", " ")}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Recent activity">
          {dash.recentActivity.length === 0 ? (
            <p className="text-sm text-[var(--workspace-muted)]">No recent operational activity.</p>
          ) : (
            <ul className="space-y-3">
              {dash.recentActivity.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-3 border-b border-[var(--workspace-border)] pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <div className="text-sm capitalize">{activityLabel(entry.action)}</div>
                    <div className="text-xs text-[var(--workspace-muted)]">
                      {entry.resourceType}
                      {entry.actorRole ? ` · ${entry.actorRole.replace("_", " ")}` : ""}
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] text-[var(--workspace-muted)]">
                    {entry.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
