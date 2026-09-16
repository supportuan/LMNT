export const ASSET_UI_STATUSES = [
  "available",
  "in_use",
  "maintenance",
  "damaged",
  "retired",
] as const;

export type AssetUiStatus = (typeof ASSET_UI_STATUSES)[number];

export type AssetStatusSource = {
  status: string;
  assignedTrainerId?: string | null;
  assignedArea?: string | null;
  retiredAt?: Date | string | null;
  nextMaintenanceAt?: Date | string | null;
};

export const ASSET_STATUS_LABEL: Record<AssetUiStatus, string> = {
  available: "Available",
  in_use: "In Use",
  maintenance: "Under Maintenance",
  damaged: "Damaged",
  retired: "Retired",
};

export function assetUiStatus(asset: AssetStatusSource): AssetUiStatus {
  if (asset.retiredAt) return "retired";
  if (asset.status === "maintenance") return "maintenance";
  if (asset.status === "down") return "damaged";
  if (asset.assignedTrainerId || asset.assignedArea) return "in_use";
  return "available";
}

export function assetNeedsAttention(asset: AssetStatusSource, now = new Date()) {
  const ui = assetUiStatus(asset);
  if (ui === "retired") return false;
  if (ui === "damaged") return true;
  if (!asset.nextMaintenanceAt) return false;
  const next = asset.nextMaintenanceAt instanceof Date ? asset.nextMaintenanceAt : new Date(asset.nextMaintenanceAt);
  return !Number.isNaN(next.getTime()) && next.getTime() <= now.getTime();
}

export function assetUiToDb(status: AssetUiStatus): {
  status: "operational" | "down" | "maintenance";
  assignedArea: string | null;
  retiredAt: Date | null;
} {
  if (status === "maintenance") return { status: "maintenance", assignedArea: null, retiredAt: null };
  if (status === "damaged") return { status: "down", assignedArea: null, retiredAt: null };
  if (status === "retired") return { status: "down", assignedArea: null, retiredAt: new Date() };
  if (status === "in_use") return { status: "operational", assignedArea: "Floor", retiredAt: null };
  return { status: "operational", assignedArea: null, retiredAt: null };
}

export function assetIdLabel(serialNumber: string | null | undefined, id: string) {
  if (serialNumber) return serialNumber;
  return `AST-${id.slice(0, 8).toUpperCase()}`;
}

export function assetStatusTone(status: AssetUiStatus): "success" | "info" | "warning" | "danger" | "neutral" {
  if (status === "available") return "success";
  if (status === "in_use") return "info";
  if (status === "maintenance") return "warning";
  if (status === "retired") return "neutral";
  return "danger";
}
