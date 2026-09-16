import Link from "next/link";
import { redirect } from "next/navigation";
import { AssetInventory } from "@/components/admin/asset-inventory";
import { AddAssetForm } from "@/components/operations/add-asset-form";
import { KpiIconAssets } from "@/components/dashboard/kpi-icons";
import { PageHeader, StatCard } from "@/components/ui";
import { assetNeedsAttention, assetUiStatus } from "@/lib/asset-status";
import { canAccessModule } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getAssetTrainers } from "@/modules/admin-queries";
import { getAssets, getCentresForSession } from "@/modules/queries";

const VIEWS = ["all", "equipment", "maintenance", "assigned", "damaged", "categories"] as const;
type AssetView = (typeof VIEWS)[number];

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "assets")) redirect("/login");

  const { view: rawView } = await searchParams;
  const view: AssetView = VIEWS.includes(rawView as AssetView) ? (rawView as AssetView) : "all";

  const [items, centres, trainers] = await Promise.all([
    getAssets(session),
    getCentresForSession(session),
    getAssetTrainers(session),
  ]);
  const uiStatuses = items.map(assetUiStatus);
  const overview = {
    total: items.length,
    inUse: uiStatuses.filter((s) => s === "in_use").length,
    maintenance: uiStatuses.filter((s) => s === "maintenance").length,
    needsAttention: items.filter((item) => assetNeedsAttention(item)).length,
  };

  return (
    <>
      <PageHeader
        title="Assets"
        description="Keep every asset accounted for."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/app/work-requests" className="text-sm font-semibold text-[var(--workspace-accent)]">
              Work requests →
            </Link>
            {centres.length > 0 ? <AddAssetForm centres={centres} trainers={trainers} /> : null}
          </div>
        }
      />

      <div className="mb-6 grid gap-[var(--grid-gutter)] sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Assets" value={overview.total} icon={<KpiIconAssets />} />
        <StatCard label="In Use" value={overview.inUse} />
        <StatCard label="Under Maintenance" value={overview.maintenance} />
        <StatCard label="Needs Attention" value={overview.needsAttention} />
      </div>

      <AssetInventory
        view={view}
        trainers={trainers}
        assets={items.map((item) => ({
          ...item,
          centreName: session.centreNames[item.centreId] ?? "—",
        }))}
      />
    </>
  );
}
