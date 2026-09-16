export const DEFAULT_TRAINER_SHARE_BPS = 5000;

export function applyShareBps(amountInr: number, bps: number) {
  if (amountInr <= 0 || bps <= 0) return 0;
  return Math.round((amountInr * bps) / 10000);
}

export function collectedInr(packageValue: number, amountDue: number) {
  return Math.max(0, packageValue - amountDue);
}

export function trainerCollectedInr(packageValue: number, amountDue: number, bps: number) {
  return applyShareBps(collectedInr(packageValue, amountDue), bps);
}

export function bpsToPercent(bps: number) {
  return Math.round(bps) / 100;
}

export function percentToBps(percent: number) {
  const clamped = Math.min(100, Math.max(0, percent));
  return Math.round(clamped * 100);
}
