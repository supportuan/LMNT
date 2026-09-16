import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { ClientRoster } from "@/components/trainer/client-roster";
import { NewClientForm } from "@/components/trainer/new-client-form";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getTrainerClientsEnriched } from "@/modules/trainer-queries";
import { getOrgPackages } from "@/modules/sales-queries";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; new?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "clients")) redirect(getRoleHome(session.activeRole));

  const { filter, new: isNew } = await searchParams;
  const [clients, packages] = await Promise.all([getTrainerClientsEnriched(session), getOrgPackages(session)]);

  return (
    <>
      <PageHeader
        title="Clients"
        description="Search, filter, and open a client profile."
        action={
          <NewClientForm
            defaultOpen={isNew === "1"}
            packages={packages.filter((pkg) => pkg.active).map((pkg) => ({
              name: pkg.name,
              sessionCount: pkg.sessionCount,
              priceInr: pkg.priceInr,
              trainerShareBps: pkg.trainerShareBps,
            }))}
          />
        }
      />
      <ClientRoster clients={clients} initialFilter={filter} />
    </>
  );
}
