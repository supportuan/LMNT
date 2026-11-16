import { redirect } from "next/navigation";
import { AddClientButton } from "@/components/coach-os/add-client";
import { PageHeader } from "@/components/ui";
import { ClientRoster } from "@/components/trainer/client-roster";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getScheduleBlocks, getTrainerClientsEnriched } from "@/modules/trainer-queries";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "clients")) redirect(getRoleHome(session.activeRole));
  if (session.activeRole !== "trainer") redirect("/app/members");

  const { filter } = await searchParams;
  const [clients, blocks] = await Promise.all([getTrainerClientsEnriched(session), getScheduleBlocks(session)]);
  const occupied = blocks.map((b) => ({ dayOfWeek: b.dayOfWeek, timeSlot: b.timeSlot }));

  return (
    <>
      <PageHeader
        title="Clients"
        description="Your clients, packages, and follow-ups in one place."
        action={<AddClientButton occupied={occupied} label="+ Add Client" />}
      />
      <ClientRoster clients={clients} initialFilter={filter} />
    </>
  );
}
