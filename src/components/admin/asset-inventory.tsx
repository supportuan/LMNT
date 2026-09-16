"use client";

import { useMemo, useState } from "react";
import { AssetStatusEditor } from "@/components/operations/asset-status-editor";
import { Badge, DataTable, Pagination, SearchInput, SelectInput } from "@/components/ui";
import {
  ASSET_STATUS_LABEL,
  assetIdLabel,
  assetNeedsAttention,
  assetStatusTone,
  assetUiStatus,
} from "@/lib/asset-status";
import { formatDate } from "@/lib/format";

export type AssetRow = {
  id: string;
  name: string;
  category: string;
  serialNumber: string | null;
  location: string | null;
  assignedArea: string | null;
  assignedTrainerId: string | null;
  assignedTrainerName?: string | null;
  status: string;
  purchaseDate: Date | string | null;
  lastServiceAt: Date | string | null;
  nextMaintenanceAt: Date | string | null;
  retiredAt?: Date | string | null;
  centreName: string;
};

const PAGE_SIZE = 8;

type AssetView = "all" | "equipment" | "maintenance" | "assigned" | "damaged" | "categories";

const VIEW_TABS: { id: AssetView; label: string; href: string }[] = [
  { id: "all", label: "All Assets", href: "/app/assets" },
  { id: "assigned", label: "In Use", href: "/app/assets?view=assigned" },
  { id: "equipment", label: "Available", href: "/app/assets?view=equipment" },
  { id: "maintenance", label: "Maintenance", href: "/app/assets?view=maintenance" },
  { id: "damaged", label: "Damaged", href: "/app/assets?view=damaged" },
  { id: "categories", label: "Categories", href: "/app/assets?view=categories" },
];

export function AssetInventory({
  assets,
  view,
}: {
  assets: AssetRow[];
  view: AssetView;
  trainers?: { id: string; name: string }[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);

  const scoped = useMemo(() => {
    return assets.filter((asset) => {
      const ui = assetUiStatus(asset);
      if (view === "equipment") return ui === "available";
      if (view === "maintenance") return ui === "maintenance" || assetNeedsAttention(asset);
      if (view === "assigned") return ui === "in_use";
      if (view === "damaged") return ui === "damaged" || Boolean(asset.retiredAt);
      return true;
    });
  }, [assets, view]);

  const categories = useMemo(
    () => Array.from(new Set(scoped.map((a) => a.category).filter(Boolean))).sort(),
    [scoped],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoped.filter((asset) => {
      if (category !== "all" && asset.category !== category) return false;
      if (!q) return true;
      const haystack = [asset.name, asset.category, asset.serialNumber, asset.location, asset.assignedArea, asset.centreName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [scoped, query, category]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const slice = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const grouped = useMemo(() => {
    const map = new Map<string, AssetRow[]>();
    for (const item of filtered) {
      const key = item.category || "Uncategorised";
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {VIEW_TABS.map((tab) => (
          <a
            key={tab.id}
            href={tab.href}
            className={`rounded-[10px] border px-3 py-1.5 text-xs font-semibold ${
              view === tab.id
                ? "border-[var(--workspace-accent)] bg-[var(--workspace-accent)] text-[var(--workspace-accent-text)]"
                : "neu-control text-[var(--workspace-muted)] hover:text-[var(--workspace-text)]"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          placeholder="Search equipment, ID, or location"
          className="lg:max-w-sm"
        />
        <SelectInput
          aria-label="Filter by category"
          value={category}
          onChange={(value) => {
            setCategory(value);
            setPage(1);
          }}
          className="lg:w-48"
        >
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </SelectInput>
      </div>

      {view === "categories" ? (
        <div className="space-y-6">
          {grouped.map(([group, rows]) => (
            <div key={group}>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-semibold capitalize">{group}</h3>
                <Badge tone="info">{rows.length}</Badge>
              </div>
              <AssetTable rows={rows} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <AssetTable rows={slice} />
          <Pagination page={currentPage} pageCount={pageCount} onPage={setPage} />
        </>
      )}
    </div>
  );
}

function AssetTable({ rows }: { rows: AssetRow[] }) {
  return (
    <DataTable
      headers={[
        "Asset ID",
        "Equipment name",
        "Category",
        "Location",
        "Status",
        "Purchase date",
        "Last maintenance",
        "Next maintenance",
      ]}
      rows={rows.map((asset) => {
        const ui = assetUiStatus(asset);
        return [
          <span key={`${asset.id}-id`} className="font-mono text-xs text-[var(--workspace-muted)]">
            {assetIdLabel(asset.serialNumber, asset.id)}
          </span>,
          <div key={`${asset.id}-name`}>
            <div className="font-medium">{asset.name}</div>
            <div className="text-[11px] text-[var(--workspace-muted)]">{asset.centreName}</div>
          </div>,
          <span key={`${asset.id}-cat`} className="capitalize">
            {asset.category}
          </span>,
          asset.location || asset.assignedArea || "—",
          <div key={`${asset.id}-status`} className="flex flex-col gap-1.5">
            <Badge tone={assetStatusTone(ui)}>{ASSET_STATUS_LABEL[ui]}</Badge>
            <AssetStatusEditor
              assetId={asset.id}
              currentStatus={asset.status}
              assignedArea={asset.assignedArea}
              assignedTrainerId={asset.assignedTrainerId}
              retiredAt={asset.retiredAt}
            />
          </div>,
          formatDate(asset.purchaseDate),
          formatDate(asset.lastServiceAt),
          formatDate(asset.nextMaintenanceAt),
        ];
      })}
    />
  );
}
