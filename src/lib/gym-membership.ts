export const GYM_PACK_MONTHS = [3, 6, 12, 24] as const;
export type GymPackMonths = (typeof GYM_PACK_MONTHS)[number];

export type GymMembershipStatus = "active" | "inactive" | "paused" | "expired";

export type GymMembershipDisplayStatus =
  | GymMembershipStatus
  | "expiring soon";

const EXPIRING_SOON_MS = 14 * 86400000;

export function packLabel(months: number) {
  return `${months}m`;
}

export function addMonthsUTC(start: Date, months: number) {
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + months);
  return end;
}

export function gymMembershipDisplayStatus(
  status: GymMembershipStatus,
  endsAt: Date,
  now = new Date(),
): GymMembershipDisplayStatus {
  if (status === "active" && endsAt.getTime() > now.getTime() && endsAt.getTime() - now.getTime() <= EXPIRING_SOON_MS) {
    return "expiring soon";
  }
  if (status === "active" && endsAt.getTime() <= now.getTime()) {
    return "expired";
  }
  return status;
}

export function displayStatusTone(
  label: GymMembershipDisplayStatus,
): "success" | "warning" | "danger" | "neutral" {
  if (label === "active") return "success";
  if (label === "expiring soon") return "warning";
  if (label === "paused") return "neutral";
  if (label === "inactive") return "neutral";
  return "danger";
}