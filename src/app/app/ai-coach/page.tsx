import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { AiCoachPanel } from "@/components/ai-coach-panel";
import { canAccessModule } from "@/lib/policy";
import { PRODUCT_SOURCES } from "@/lib/product-sources";
import { getSession } from "@/lib/session";
import { getTrainerClients } from "@/modules/queries";

export default async function AiCoachPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "ai-coach")) redirect("/login");

  const clients = await getTrainerClients(session);

  const source = PRODUCT_SOURCES.trainer.aiCoach;

  return (
    <>
      <PageHeader
        title="Client talk suggestions"
        description={`${source.source} — ${source.features.join(", ")}.`}
      />
      {clients.length === 0 ? (
        <p className="text-sm text-zinc-500">No assigned clients yet.</p>
      ) : (
        <AiCoachPanel clients={clients} />
      )}
    </>
  );
}
