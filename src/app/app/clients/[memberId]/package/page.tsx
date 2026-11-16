import Link from "next/link";
import { redirect } from "next/navigation";
import { GymMembershipPanel } from "@/components/admin/gym-membership-panel";
import { PtPackActions } from "@/components/admin/pt-pack-actions";
import { PtPackForm } from "@/components/admin/pt-pack-form";
import { PaymentHistoryPanel } from "@/components/trainer/payment-history-panel";
import { RecordPaymentButton } from "@/components/trainer/record-payment-button";
import { Badge, Panel } from "@/components/ui";
import { assertMemberAccess } from "@/lib/access";
import { hasPermission, PERMISSIONS } from "@/lib/policy";
import { applyShareBps, bpsToPercent, trainerCollectedInr } from "@/lib/trainer-share";
import { getSession } from "@/lib/session";
import { getScheduleTrainers } from "@/modules/admin-queries";
import { getCentresForSession } from "@/modules/queries";
import { getOrgPackages } from "@/modules/sales-queries";
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
  const centres = await getCentresForSession(session);
  const canEditGym = hasPermission(session.activeRole, PERMISSIONS.CLIENT_CREATE);
  const trainers = canEditGym ? await getScheduleTrainers(session) : [];
  const packages = canEditGym ? (await getOrgPackages(session)).filter((p) => p.active) : [];

  return (
    <div className="space-y-4">
      <GymMembershipPanel
        membership={ws?.gymMembership ?? null}
        memberId={memberId}
        memberName={ws?.member.name ?? "Member"}
        canEdit={canEditGym}
        members={[{ id: memberId, name: ws?.member.name ?? "Member", centreId: ws?.member.centreId ?? "" }]}
        centres={centres.map((c) => ({ id: c.id, name: c.name }))}
      />

      {canEditGym && ws ? (
        <Panel title="PT pack (Screen 4)">
          <PtPackForm
            initialMemberId={memberId}
            centres={centres}
            members={[{ id: memberId, name: ws.member.name, centreId: ws.member.centreId }]}
            trainers={trainers}
            packages={packages.map((p) => ({
              id: p.id,
              name: p.name,
              sessionCount: p.sessionCount,
              priceInr: p.priceInr,
            }))}
          />
        </Panel>
      ) : null}

      <Panel title="PT package & payments">
        {!plan ? (
          <p className="text-sm text-[var(--workspace-muted)]">No active PT session pack.</p>
        ) : (
          <>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--workspace-muted)]">Plan</dt>
                <dd className="font-medium">{plan.planName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--workspace-muted)]">Status</dt>
                <dd className="flex items-center gap-2">
                  <Badge tone={plan.status === "active" ? "success" : "warning"}>{plan.status}</Badge>
                  {canEditGym ? <PtPackActions planId={plan.id} status={plan.status} /> : null}
                </dd>
              </div>
              {plan.trainingDays && (
                <div className="flex justify-between">
                  <dt className="text-[var(--workspace-muted)]">Schedule</dt>
                  <dd className="font-medium text-right">
                    {plan.trainingDays}
                    {plan.trainingTime ? ` · ${plan.trainingTime}` : ""}
                  </dd>
                </div>
              )}
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
                  {trainerCollectedInr(plan.packageValue, plan.amountDue, plan.trainerShareBps).toLocaleString("en-IN")}{" "}
                  collected
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