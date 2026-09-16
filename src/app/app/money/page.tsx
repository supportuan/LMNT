import { redirect } from "next/navigation";
import { MoneyPageClient } from "@/components/trainer/money-page-client";
import { PageHeader } from "@/components/ui";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getTrainerMoneySummary } from "@/modules/trainer-queries";

export default async function MoneyPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "money")) redirect(getRoleHome(session.activeRole));

  const { clients, totalDue, totalPackage, collected, trainerCollected, trainerDue, trainerPackage, lowSessions } =
    await getTrainerMoneySummary(session);

  return (
    <>
      <PageHeader
        title="Money"
        description="Your share of membership revenue, outstanding dues, and renewal signals."
      />
      <MoneyPageClient
        clients={clients}
        totalDue={totalDue}
        totalPackage={totalPackage}
        collected={collected}
        trainerCollected={trainerCollected}
        trainerDue={trainerDue}
        trainerPackage={trainerPackage}
        lowSessions={lowSessions}
      />
    </>
  );
}
