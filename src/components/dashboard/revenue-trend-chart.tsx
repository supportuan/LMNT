"use client";

import { formatChartDayLabel } from "@/lib/format";

type RevenuePoint = {
  date: string;
  collected: number;
};

function formatInr(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

export function RevenueTrendChart({ points }: { points: RevenuePoint[] }) {
  const total = points.reduce((s, p) => s + p.collected, 0);
  const nonZero = points.map((p) => p.collected).filter((n) => n > 0);
  const low = nonZero.length ? Math.min(...nonZero) : 0;

  const maxVal = Math.max(...points.map((p) => p.collected), 1);

  if (total === 0) {
    return (
      <div className="neu-inset flex h-40 items-center justify-center rounded-[14px] text-sm text-[var(--workspace-muted)]">
        No payments recorded in the last 30 days.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-wide text-[var(--workspace-muted)]">
            30-day collected
          </div>
          <div className="font-mono text-2xl font-bold tabular-nums text-[var(--workspace-accent)]">
            ₹{total.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      <div className="flex items-end gap-1 overflow-x-auto pb-2" style={{ minHeight: 120 }}>
        {points.map((point) => (
          <div key={point.date} className="flex min-w-[24px] flex-1 flex-col items-center gap-1">
            <div className="flex h-24 w-full items-end justify-center">
              <div
                className="w-full max-w-[20px] rounded-t bg-[var(--workspace-accent)] transition-all"
                style={{
                  height: `${Math.max((point.collected / maxVal) * 100, point.collected > 0 ? 6 : 0)}%`,
                }}
                title={`${formatChartDayLabel(point.date)}: ₹${point.collected.toLocaleString("en-IN")}`}
              />
            </div>
            <span className="text-[8px] text-[var(--workspace-muted)]">{formatChartDayLabel(point.date)}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between font-mono text-[10px] text-[var(--workspace-muted)]">
        <span>Low {formatInr(low)}</span>
        <span>Peak {formatInr(maxVal)}</span>
      </div>
    </div>
  );
}
