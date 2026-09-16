import Link from "next/link";
import { redirect } from "next/navigation";
import { LeadKanban } from "@/components/trainer/lead-kanban";
import { PageHeader } from "@/components/ui";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getLeadsPipeline, groupLeadsByStage } from "@/modules/sales-queries";

export default async function LeadsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "leads")) redirect(getRoleHome(session.activeRole));

  const leadsList = await getLeadsPipeline(session);
  const grouped = groupLeadsByStage(leadsList);

  return (
    <>
      <PageHeader
        title="Leads & Sales"
        description="Pipeline kanban — drag prospects between stages, run consultations, convert to clients."
        action={
          <Link
            href="/app/leads/consultation"
            className="rounded-md bg-[var(--workspace-accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            Start consultation
          </Link>
        }
      />

      <LeadKanban grouped={grouped} />
    </>
  );
}
