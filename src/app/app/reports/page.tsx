import { redirect } from "next/navigation";
import { AnalyticsTrendChart } from "@/components/dashboard/analytics-trend-chart";
import { BranchChart } from "@/components/dashboard/branch-chart";
import { RevenueTrendChart } from "@/components/dashboard/revenue-trend-chart";
import { TrainerUtilisationTable } from "@/components/dashboard/trainer-utilisation-table";
import { Badge, DataTable, PageHeader, Panel, StatCard } from "@/components/ui";
import { assetNeedsAttention, assetUiStatus } from "@/lib/asset-status";
import { formatInr } from "@/lib/format";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getReportingSnapshot } from "@/lib/metrics";
import { getAssets } from "@/modules/queries";
import { getAnalyticsTimeSeries, getRevenueTimeSeries } from "@/modules/sales-queries";
import { workspaceCentreLabel } from "@/lib/branch-scope";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "reports")) redirect(getRoleHome(session.activeRole));

  const [stats, trends, revenueTrend, assetRows] = await Promise.all([
    getReportingSnapshot(session),
    getAnalyticsTimeSeries(session),
    getRevenueTimeSeries(session),
    getAssets(session),
  ]);
  const trainerUtil = stats.trainers;

  const live = assetRows.filter((asset) => !asset.retiredAt);
  const inUse = live.filter((asset) => assetUiStatus(asset) === "in_use").length;
  const inventoryValue = live.reduce((sum, asset) => sum + (asset.purchaseCost ?? 0), 0);
  const maintenanceCount = live.filter((asset) => asset.status === "maintenance").length;
  const attentionCount = assetRows.filter((asset) => assetNeedsAttention(asset)).length;

  return (
    <>
      <PageHeader
        title="Reports"
        description={`Revenue, member growth, attendance, trainer performance, and asset health for ${workspaceCentreLabel(session)}.`}
      />

      <div className="mb-6 grid gap-[var(--grid-gutter)] sm:grid-cols-3">
        <StatCard
          label="Asset utilization"
          value={`${live.length ? Math.round((inUse / live.length) * 100) : 0}%`}
          hint="In use vs live inventory"
        />
        <StatCard label="Maintenance" value={maintenanceCount} hint={`${attentionCount} need attention`} />
        <StatCard label="Asset inventory value" value={formatInr(inventoryValue)} hint={`${assetRows.length} assets`} />
      </div>

      <div className="mb-6 grid gap-[var(--grid-gutter)] sm:grid-cols-2 xl:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Members" value={stats.members} accent />
        <StatCard label="Sessions logged" value={stats.sessions} />
        <StatCard label="Check-ins today" value={stats.attendanceToday} />
        <StatCard label="Collected" value={formatInr(stats.revenue.collected)} accent />
        <StatCard label="Retention" value={`${stats.retentionRate}%`} hint="Active packages ÷ members" />
        <StatCard label="Adherence" value={`${stats.adherenceRate}%`} hint="Completed ÷ scheduled (30d)" />
      </div>

      <div className="mb-6 grid gap-[var(--grid-gutter)] sm:grid-cols-3">
        <StatCard label="PT utilisation" value={`${stats.ptUtilisation}%`} hint="Avg trainer load (30d)" />
        <StatCard
          label="Member growth"
          value={`${stats.deltas.membersDelta >= 0 ? "+" : ""}${stats.deltas.membersDelta}%`}
          hint="30d vs prior 30d"
        />
        <StatCard
          label="Lead growth"
          value={`${stats.deltas.leadsDelta >= 0 ? "+" : ""}${stats.deltas.leadsDelta}%`}
          hint="30d vs prior 30d"
        />
      </div>

      <div className="mb-6 grid gap-[var(--grid-gutter)] lg:grid-cols-2">
        <Panel title="30-day activity" action={<Badge tone="info">Daily</Badge>}>
          <AnalyticsTrendChart points={trends} />
        </Panel>
        <Panel title="Revenue collected" action={<Badge tone="success">Payments</Badge>}>
          <RevenueTrendChart points={revenueTrend} />
        </Panel>
      </div>

      <div className="mb-6 grid gap-[var(--grid-gutter)] lg:grid-cols-2">
        <Panel title="Branch performance">
          <BranchChart branches={stats.branches} />
        </Panel>
        <Panel title="Trainer utilisation (30d)">
          <TrainerUtilisationTable trainers={trainerUtil} />
        </Panel>
      </div>

      <Panel title="Branch breakdown">
        <DataTable
          headers={["Branch", "Members", "Sessions", "Capacity"]}
          rows={stats.branches.map((branch) => [
            branch.name,
            branch.members,
            branch.sessions,
            <Badge key={branch.name} tone={branch.utilisation > 80 ? "warning" : "success"}>
              {branch.utilisation}% utilised
            </Badge>,
          ])}
        />
      </Panel>
    </>
  );
}
