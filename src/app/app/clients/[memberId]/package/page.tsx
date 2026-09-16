import Link from "next/link";
import { redirect } from "next/navigation";
import { PaymentHistoryPanel } from "@/components/trainer/payment-history-panel";
import { RecordPaymentButton } from "@/components/trainer/record-payment-button";
import { Badge, Panel } from "@/components/ui";
import { assertMemberAccess } from "@/lib/access";
import { applyShareBps, bpsToPercent, trainerCollectedInr } from "@/lib/trainer-share";
import { getSession } from "@/lib/session";
import { getClientWorkspace, getPaymentRecordsForMember } from "@/modules/trainer-queries";

export default async function ClientPackageTab({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  await assertMemberAccess(session, memberId);

  const ws = await getClientWorkspace(session, memberId);
  const plan = ws?.plan;
  const payments = plan ? await getPaymentRecordsForMember(memberId) : [];

  return (
    <div className="space-y-4">
      <Panel title="Package & payments">
        {!plan ? (
          <p className="text-sm text-[var(--workspace-muted)]">No active package on file.</p>
        ) : (
          <>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--workspace-muted)]">Plan</dt>
                <dd className="font-medium">{plan.planName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--workspace-muted)]">Status</dt>
                <dd>
                  <Badge tone={plan.status === "active" ? "success" : "warning"}>{plan.status}</Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--workspace-muted)]">Sessions remaining</dt>
                <dd className="font-medium">
                  {plan.sessionsRemaining} / {plan.totalSessions}
                  {plan.sessionsRemaining <= 2 && (
                    <span className="ml-2">
                      <Badge tone="warning">Renewal soon</Badge>
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--workspace-muted)]">Package value</dt>
                <dd className="font-medium">₹{plan.packageValue.toLocaleString("en-IN")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--workspace-muted)]">Amount due</dt>
                <dd className={`font-medium ${plan.amountDue > 0 ? "text-[var(--status-warning)]" : ""}`}>
                  {plan.amountDue > 0 ? `₹${plan.amountDue.toLocaleString("en-IN")}` : "Paid up"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--workspace-muted)]">Trainer share</dt>
                <dd className="font-medium">
                  {bpsToPercent(plan.trainerShareBps)}% · ₹
                  {trainerCollectedInr(plan.packageValue, plan.amountDue, plan.trainerShareBps).toLocaleString("en-IN")} collected
                  {plan.amountDue > 0
                    ? ` · ₹${applyShareBps(plan.amountDue, plan.trainerShareBps).toLocaleString("en-IN")} pending`
                    : ""}
                </dd>
              </div>
            </dl>
            {(session.activeRole === "trainer" || session.activeRole === "admin") && plan.amountDue > 0 && (
              <div className="mt-4">
                <RecordPaymentButton
                  planId={plan.id}
                  amountDue={plan.amountDue}
                  memberName={ws?.member.name ?? "Client"}
                />
              </div>
            )}
            {(session.activeRole === "trainer" || session.activeRole === "admin") && (
              <Link
                href="/app/money"
                className="mt-4 inline-block text-sm font-semibold text-[var(--workspace-accent)]"
              >
                View in Money →
              </Link>
            )}
          </>
        )}
      </Panel>
      {payments.length > 0 && <PaymentHistoryPanel payments={payments} />}
    </div>
  );
}
