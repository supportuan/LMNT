"use client";

import { formatChartDayLabel } from "@/lib/format";

type TrendPoint = {
  date: string;
  sessions: number;
  leads: number;
  checkIns: number;
};

export function AnalyticsTrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="neu-inset flex h-48 items-center justify-center rounded-[14px] text-sm text-[var(--workspace-muted)]">
        No trend data yet. Activity appears as sessions and leads are logged.
      </div>
    );
  }

  const maxVal = Math.max(...points.flatMap((p) => [p.sessions, p.leads, p.checkIns]), 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-[11px] font-medium uppercase tracking-wide">
        <span className="flex items-center gap-2 text-[var(--workspace-muted)]">
          <span className="h-2 w-2 rounded-full bg-[var(--workspace-accent)]" />
          Sessions
        </span>
        <span className="flex items-center gap-2 text-[var(--workspace-muted)]">
          <span className="h-2 w-2 rounded-full bg-[var(--kinetic-orange)]" />
          Leads
        </span>
        <span className="flex items-center gap-2 text-[var(--workspace-muted)]">
          <span className="h-2 w-2 rounded-full bg-[var(--kinetic-cyan)]" />
          Check-ins
        </span>
      </div>

      <div className="flex items-end gap-1 overflow-x-auto pb-2" style={{ minHeight: 160 }}>
        {points.map((point) => (
          <div key={point.date} className="flex min-w-[28px] flex-1 flex-col items-center gap-1">
            <div className="flex h-32 w-full items-end justify-center gap-0.5">
              <div
                className="w-2 rounded-t bg-[var(--workspace-accent)] transition-all"
                style={{ height: `${Math.max((point.sessions / maxVal) * 100, point.sessions > 0 ? 4 : 0)}%` }}
                title={`${point.sessions} sessions`}
              />
              <div
                className="w-2 rounded-t bg-[var(--kinetic-orange)] transition-all"
                style={{ height: `${Math.max((point.leads / maxVal) * 100, point.leads > 0 ? 4 : 0)}%` }}
                title={`${point.leads} leads`}
              />
              <div
                className="w-2 rounded-t bg-[var(--kinetic-cyan)] transition-all"
                style={{ height: `${Math.max((point.checkIns / maxVal) * 100, point.checkIns > 0 ? 4 : 0)}%` }}
                title={`${point.checkIns} check-ins`}
              />
            </div>
            <span className="text-[9px] text-[var(--workspace-muted)]">{formatChartDayLabel(point.date)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
