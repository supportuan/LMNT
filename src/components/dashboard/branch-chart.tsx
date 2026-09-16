type BranchDatum = {
  name: string;
  members: number;
  sessions: number;
  utilisation: number;
};

export function BranchChart({ branches }: { branches: BranchDatum[] }) {
  if (branches.length === 0) {
    return (
      <div className="neu-inset flex h-48 items-center justify-center rounded-[14px] text-sm text-[var(--workspace-muted)]">
        No branch data yet — charts appear when centres have members.
      </div>
    );
  }

  const maxMembers = Math.max(...branches.map((b) => b.members), 1);

  return (
    <div className="space-y-5 pt-2">
      {branches.map((branch) => (
        <div key={branch.name}>
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-[var(--workspace-text)]">{branch.name}</div>
              <div className="text-[11px] text-[var(--workspace-muted)]">
                {branch.members} members · {branch.sessions} sessions
              </div>
            </div>
            <span className="text-sm font-semibold tabular-nums text-[var(--workspace-accent)]">
              {branch.utilisation}%
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[var(--workspace-elevated)]">
            <div
              className="h-full rounded-full bg-[var(--workspace-accent)] transition-all duration-500"
              style={{ width: `${Math.max((branch.members / maxMembers) * 100, 4)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
