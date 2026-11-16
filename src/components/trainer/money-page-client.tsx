import Link from "next/link";
import { RecordPaymentButton } from "@/components/trainer/record-payment-button";
import { Badge, EmptyState } from "@/components/ui";
import { bpsToPercent, trainerCollectedInr } from "@/lib/trainer-share";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

type MoneyClient = {
  planId: string;
  memberId: string;
  memberName: string;
  planName: string;
  packageValue: number;
  amountDue: number;
  sessionsRemaining: number;
  totalSessions: number;
  trainerShareBps: number;
};

export function MoneyPageClient({
  clients,
  totalDue,
  totalPackage,
  collected,
  trainerCollected,
  trainerDue,
  trainerPackage,
}: {
  clients: MoneyClient[];
  totalDue: number;
  totalPackage: number;
  collected: number;
  trainerCollected: number;
  trainerDue: number;
  trainerPackage: number;
}) {
  const activeClients = new Set(clients.map((c) => c.memberId)).size;
  const sessionsRemaining = clients.reduce((sum, c) => sum + c.sessionsRemaining, 0);
  const dueCount = clients.filter((c) => c.amountDue > 0).length;

  const kpis = [
    { label: "Active clients", value: String(activeClients) },
    { label: "Sessions remaining", value: String(sessionsRemaining) },
    { label: "Payments due", value: inr(totalDue), tone: totalDue > 0 ? "text-[var(--status-warning)]" : "", sub: `${dueCount} client${dueCount === 1 ? "" : "s"}` },
    { label: "Package value tracked", value: inr(totalPackage), tone: "text-[var(--emerald-neon)]", sub: `${inr(collected)} collected` },
  ];

  const sorted = [...clients].sort(
    (a, b) => Number(b.amountDue > 0) - Number(a.amountDue > 0) || a.sessionsRemaining - b.sessionsRemaining,
  );

  return (
    <>
      <div className="mb-[var(--grid-gutter)] grid grid-cols-2 gap-[var(--grid-gutter)] lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="neu-card p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-[var(--workspace-muted)]">{k.label}</div>
            <div className={`mt-2 text-2xl font-bold tabular-nums ${k.tone ?? ""}`}>{k.value}</div>
            {k.sub && <div className="mt-1 text-xs text-[var(--workspace-subtle)]">{k.sub}</div>}
          </div>
        ))}
      </div>

      <section className="neu-card mb-[var(--grid-gutter)] grid gap-4 p-5 sm:grid-cols-3">
        <div>
          <div className="text-xs text-[var(--workspace-muted)]">Your earned share</div>
          <div className="mt-1 text-lg font-bold tabular-nums text-[var(--emerald-neon)]">{inr(trainerCollected)}</div>
        </div>
        <div>
          <div className="text-xs text-[var(--workspace-muted)]">Your share still outstanding</div>
          <div className="mt-1 text-lg font-bold tabular-nums">{inr(trainerDue)}</div>
        </div>
        <div>
          <div className="text-xs text-[var(--workspace-muted)]">Your share of all packages</div>
          <div className="mt-1 text-lg font-bold tabular-nums">{inr(trainerPackage)}</div>
        </div>
      </section>

      <section className="neu-card p-[var(--card-padding)]">
        <h2 className="mb-4 text-base font-semibold tracking-tight">Client payment status</h2>
        {sorted.length === 0 ? (
          <EmptyState title="No active packages" description="Packages you add for clients show up here." />
        ) : (
          <ul className="divide-y divide-[var(--workspace-border)]">
            {sorted.map((c) => {
              const low = c.sessionsRemaining <= 2;
              return (
                <li key={c.planId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/app/clients/${c.memberId}`} className="font-semibold hover:text-[var(--emerald-neon)]">
                      {c.memberName}
                    </Link>
                    <div className="text-xs text-[var(--workspace-muted)]">
                      {c.planName} · {c.sessionsRemaining}/{c.totalSessions} sessions left · package {inr(c.packageValue)} ·
                      your share {bpsToPercent(c.trainerShareBps)}% ({inr(trainerCollectedInr(c.packageValue, c.amountDue, c.trainerShareBps))} earned)
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {low && <Badge tone="warning">Renewal due</Badge>}
                    {c.amountDue > 0 ? (
                      <>
                        <Badge tone="danger">{inr(c.amountDue)} due</Badge>
                        <RecordPaymentButton planId={c.planId} amountDue={c.amountDue} memberName={c.memberName} />
                      </>
                    ) : (
                      <Badge tone="success">Paid</Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
