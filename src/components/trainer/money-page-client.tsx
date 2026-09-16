"use client";

import Link from "next/link";
import { RecordPaymentButton } from "@/components/trainer/record-payment-button";
import { Badge, DataTable, Panel } from "@/components/ui";
import { applyShareBps, bpsToPercent, trainerCollectedInr } from "@/lib/trainer-share";

function formatInr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function MoneyPageClient({
  clients,
  totalDue,
  totalPackage,
  collected,
  trainerCollected,
  trainerDue,
  trainerPackage,
  lowSessions,
}: {
  clients: {
    planId: string;
    memberId: string;
    memberName: string;
    planName: string;
    packageValue: number;
    amountDue: number;
    sessionsRemaining: number;
    totalSessions: number;
    trainerShareBps: number;
  }[];
  totalDue: number;
  totalPackage: number;
  collected: number;
  trainerCollected: number;
  trainerDue: number;
  trainerPackage: number;
  lowSessions: typeof clients;
}) {
  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-5">
          <div className="text-xs uppercase text-[var(--workspace-muted)]">Your revenue</div>
          <div className="mt-2 text-2xl font-bold text-[var(--status-success)]">{formatInr(trainerCollected)}</div>
          <div className="mt-1 text-[11px] text-[var(--workspace-muted)]">
            {formatInr(collected)} collected · your cut of {formatInr(trainerPackage)}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-5">
          <div className="text-xs uppercase text-[var(--workspace-muted)]">Your outstanding</div>
          <div className="mt-2 text-2xl font-bold text-[var(--status-warning)]">{formatInr(trainerDue)}</div>
          <div className="mt-1 text-[11px] text-[var(--workspace-muted)]">{formatInr(totalDue)} gym dues remaining</div>
        </div>
        <div className="rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-5">
          <div className="text-xs uppercase text-[var(--workspace-muted)]">Package value</div>
          <div className="mt-2 text-2xl font-bold">{formatInr(totalPackage)}</div>
          <div className="mt-1 text-[11px] text-[var(--workspace-muted)]">Gym package total</div>
        </div>
      </div>

      {lowSessions.length > 0 && (
        <Panel title="Low session packages" elevated>
          <div className="space-y-2">
            {lowSessions.map((c) => (
              <div
                key={c.memberId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--workspace-border)] p-3 text-sm"
              >
                <div>
                  <Link href={`/app/clients/${c.memberId}`} className="font-semibold hover:underline">
                    {c.memberName}
                  </Link>
                  <span className="ml-2 text-[var(--workspace-muted)]">
                    {c.sessionsRemaining} of {c.totalSessions} left
                  </span>
                </div>
                <Badge tone="warning">Renewal due</Badge>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Client packages">
        <DataTable
          headers={["Client", "Plan", "Package", "Your share", "Due", "Sessions", ""]}
          rows={clients.map((c) => [
            <Link key="name" href={`/app/clients/${c.memberId}`} className="font-medium hover:underline">
              {c.memberName}
            </Link>,
            `${c.planName} · ${bpsToPercent(c.trainerShareBps)}%`,
            formatInr(c.packageValue),
            formatInr(trainerCollectedInr(c.packageValue, c.amountDue, c.trainerShareBps)),
            c.amountDue > 0 ? (
              <span className="text-[var(--status-warning)]">
                {formatInr(applyShareBps(c.amountDue, c.trainerShareBps))}
              </span>
            ) : (
              "—"
            ),
            `${c.sessionsRemaining}/${c.totalSessions}`,
            c.amountDue > 0 ? (
              <RecordPaymentButton
                key="pay"
                planId={c.planId}
                amountDue={c.amountDue}
                memberName={c.memberName}
              />
            ) : (
              "—"
            ),
          ])}
        />
      </Panel>
    </>
  );
}
