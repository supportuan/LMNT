import { redirect } from "next/navigation";
import { AiCoachPanel } from "@/components/ai-coach-panel";
import { Badge, PageHeader } from "@/components/ui";
import { getAiStatus } from "@/lib/ai-provider";
import { canAccessModule } from "@/lib/policy";
import { PRODUCT_SOURCES } from "@/lib/product-sources";
import { getSession } from "@/lib/session";
import { getTrainerClients } from "@/modules/queries";

export default async function AiCoachPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "ai-coach")) redirect("/login");

  const [clients, ai] = await Promise.all([getTrainerClients(session), getAiStatus()]);
  const source = PRODUCT_SOURCES.trainer.aiCoach;

  return (
    <>
      <PageHeader
        title="AI Coach"
        description={`${source.source} — ${source.features.join(", ")}.`}
        action={<Badge tone={ai.ready ? "success" : "neutral"}>{ai.label}</Badge>}
      />
      <p className="mb-5 text-sm text-[var(--workspace-muted)]">{ai.hint}</p>
      {clients.length === 0 ? (
        <p className="text-sm text-[var(--workspace-subtle)]">No assigned clients yet.</p>
      ) : (
        <AiCoachPanel clients={clients} />
      )}
    </>
  );
}
