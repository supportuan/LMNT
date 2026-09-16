import Link from "next/link";
import { Panel } from "@/components/ui";
import type { getCoachDna } from "@/modules/sales-queries";

export function CoachDnaPanel({
  dna,
}: {
  dna: NonNullable<Awaited<ReturnType<typeof getCoachDna>>>;
}) {
  return (
    <div className="space-y-4">
      <Panel title="Coach DNA">
        <p className="text-sm text-[var(--workspace-muted)]">
          Pattern intelligence from {dna.count} saved consultation{dna.count === 1 ? "" : "s"}.
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <dt className="text-[var(--workspace-muted)]">Avg consult score</dt>
            <dd className="text-2xl font-bold">{dna.avg}/100</dd>
          </div>
          <div>
            <dt className="text-[var(--workspace-muted)]">Client talk time</dt>
            <dd className="text-2xl font-bold">{dna.clientTalk}%</dd>
          </div>
          <div>
            <dt className="text-[var(--workspace-muted)]">Strongest skill</dt>
            <dd className="font-semibold">{dna.strong[0]} ({dna.strong[1]})</dd>
          </div>
        </dl>
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Weekly focus:</strong> {dna.weak[0]} ({dna.weak[1]}/100) — {dna.weeklyFocus}
        </div>
      </Panel>

      <Panel title="Recent consultations">
        <div className="space-y-2">
          {dna.recentReports.map((r) => (
            <div
              key={String(r.id)}
              className="flex items-center justify-between rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-[var(--workspace-muted)]">
                  {new Date(r.date).toLocaleDateString()} · {r.diag}
                </div>
              </div>
              <span className="font-semibold">{r.total}/100</span>
            </div>
          ))}
        </div>
        <Link
          href="/app/leads/consultation"
          className="mt-3 inline-block text-sm font-semibold text-[var(--workspace-accent)]"
        >
          Run another consultation →
        </Link>
      </Panel>
    </div>
  );
}
