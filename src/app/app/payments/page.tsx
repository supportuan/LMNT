import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, DataTable, PageHeader, StatCard } from "@/components/ui";
import { formatDate, formatInr, startOfMonth } from "@/lib/format";
import { applyShareBps } from "@/lib/trainer-share";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getMemberships, getOrgPayments } from "@/modules/queries";

export default async function PaymentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "payments")) redirect(getRoleHome(session.activeRole));

  const [payments, plans] = await Promise.all([getOrgPayments(session), getMemberships(session)]);
  const monthStart = startOfMonth();
  const thisMonth = payments.filter((p) => p.createdAt >= monthStart);
  const monthlyTotal = thisMonth.reduce((sum, p) => sum + p.amountInr, 0);
  const allTime = payments.reduce((sum, p) => sum + p.amountInr, 0);
  const now = Date.now();
  const pending = plans.filter((p) => p.status === "active" && p.amountDue > 0 && (!p.endsAt || p.endsAt.getTime() > now));
  const overdue = plans.filter((p) => p.amountDue > 0 && p.endsAt && p.endsAt.getTime() <= now);

  return (
    <>
      <PageHeader title="Payments" description="Revenue, paid collections, pending balances, and overdue dues." />

      <div className="mb-6 grid gap-[var(--grid-gutter)] sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={formatInr(monthlyTotal)} hint="This month" accent />
        <StatCard label="Paid" value={formatInr(allTime)} />
        <StatCard label="Pending" value={formatInr(pending.reduce((sum, p) => sum + p.amountDue, 0))} />
        <StatCard label="Overdue" value={formatInr(overdue.reduce((sum, p) => sum + p.amountDue, 0))} />
      </div>

      <DataTable
        headers={["Date", "Member", "Plan", "Amount", "Trainer cut", "Method", "Notes"]}
        rows={payments.map((payment) => [
          formatDate(payment.createdAt),
          <Link key={payment.id} href={`/app/clients/${payment.memberId}`} className="font-medium hover:text-[var(--workspace-accent)]">
            {payment.memberName}
          </Link>,
          payment.planName ?? "—",
          formatInr(payment.amountInr),
          payment.trainerShareBps
            ? formatInr(applyShareBps(payment.amountInr, payment.trainerShareBps))
            : "—",
          <Badge key={`${payment.id}-method`} tone="info">
            {payment.method.toUpperCase()}
          </Badge>,
          payment.notes ?? "—",
        ])}
      />
    </>
  );
}
