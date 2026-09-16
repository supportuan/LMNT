import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkRequestsPanel } from "@/components/operations/work-requests-panel";
import { KpiIconCheckIn } from "@/components/dashboard/kpi-icons";
import { PageHeader, StatCard } from "@/components/ui";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getAssets, getCentresForSession } from "@/modules/queries";
import { getWorkRequestStats, getWorkRequests } from "@/modules/operations-queries";

export default async function WorkRequestsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "work-requests")) redirect(getRoleHome(session.activeRole));

  const [requests, stats, assets, centres] = await Promise.all([
    getWorkRequests(session),
    getWorkRequestStats(session),
    getAssets(session),
    getCentresForSession(session),
  ]);

  const canApprove = session.activeRole === "admin" || session.activeRole === "centre_manager";

  return (
    <>
      <PageHeader
        title="Work requests"
        description="Equipment issues, maintenance workflows, and SLA-tracked operations tasks."
        action={
          <Link href="/app/assets" className="text-sm font-semibold text-[var(--workspace-accent)]">
            View assets →
          </Link>
        }
      />

      <div className="mb-6 grid gap-[var(--grid-gutter)] sm:grid-cols-3">
        <StatCard label="Open" value={stats.open} />
        <StatCard label="SLA overdue" value={stats.overdue} icon={<KpiIconCheckIn />} />
        <StatCard label="Completed" value={stats.completed} />
      </div>

      <WorkRequestsPanel
        requests={requests}
        canApprove={canApprove}
        assets={assets.map((a) => ({ id: a.id, name: a.name, centreId: a.centreId }))}
        centres={centres.map((c) => ({ id: c.id, name: c.name }))}
      />
    </>
  );
}
