"use client";

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  consultation: "Consultation",
  trial: "Trial",
  won: "Won",
  lost: "Lost",
};

const STAGE_COLORS: Record<string, string> = {
  new: "bg-[#3a4340]",
  contacted: "bg-[#9AA39D]",
  consultation: "bg-[#E8C36A]",
  trial: "bg-[#00dbe9]",
  won: "bg-[var(--workspace-accent)]",
  lost: "bg-[#ef8b7a]",
};

export function LeadFunnelChart({
  stages,
  activePipeline,
  winRate,
}: {
  stages: { stage: string; count: number }[];
  activePipeline: number;
  winRate: number;
}) {
  const max = Math.max(1, ...stages.map((s) => s.count));

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm">
        <div>
          <span className="text-[var(--workspace-muted)]">Active pipeline </span>
          <span className="font-semibold">{activePipeline}</span>
        </div>
        <div>
          <span className="text-[var(--workspace-muted)]">Win rate </span>
          <span className="font-semibold">{winRate}%</span>
        </div>
      </div>
      <div className="space-y-2">
        {stages.map((s) => (
          <div key={s.stage} className="flex items-center gap-3 text-sm">
            <span className="w-24 shrink-0 text-[var(--workspace-muted)]">
              {STAGE_LABELS[s.stage] ?? s.stage}
            </span>
            <div className="h-6 flex-1 overflow-hidden rounded bg-[var(--workspace-elevated)]">
              <div
                className={`h-full ${STAGE_COLORS[s.stage] ?? "bg-zinc-400"}`}
                style={{ width: `${Math.max(4, (s.count / max) * 100)}%` }}
              />
            </div>
            <span className="w-8 text-right font-medium">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
