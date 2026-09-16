export type AssetStatusCode = "operational" | "down" | "maintenance";

export type AssetDisplayStatus = "available" | "in_use" | "maintenance" | "damaged" | "retired";

export type AssetLike = {
  status: AssetStatusCode | string;
  retiredAt?: Date | string | null;
  nextMaintenanceAt?: Date | string | null;
  assignedTrainerId?: string | null;
  assignedArea?: string | null;
};

export function isRetired(asset: AssetLike) {
  return Boolean(asset.retiredAt);
}

export function assetDisplayStatus(asset: AssetLike): AssetDisplayStatus {
  if (isRetired(asset)) return "retired";
  if (asset.status === "maintenance") return "maintenance";
  if (asset.status === "down") return "damaged";
  if (asset.assignedTrainerId || asset.assignedArea) return "in_use";
  return "available";
}

export function assetDisplayLabel(status: AssetDisplayStatus) {
  switch (status) {
    case "available":
      return "Available";
    case "in_use":
      return "In Use";
    case "maintenance":
      return "Under Maintenance";
    case "damaged":
      return "Damaged";
    case "retired":
      return "Retired";
  }
}

export function assetNeedsAttention(asset: AssetLike, now = new Date()) {
  if (isRetired(asset)) return false;
  if (asset.status === "down") return true;
  if (!asset.nextMaintenanceAt) return false;
  const next =
    asset.nextMaintenanceAt instanceof Date ? asset.nextMaintenanceAt : new Date(asset.nextMaintenanceAt);
  return !Number.isNaN(next.getTime()) && next.getTime() <= now.getTime();
}

export const EQUIPMENT_CATEGORIES = ["equipment", "strength", "cardio", "functional", "free weights"];
