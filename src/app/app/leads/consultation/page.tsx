import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { CloseOsApp } from "@/components/prototypes/close-os-app";
import { PageHeader } from "@/components/ui";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { canAccessLead } from "@/lib/access";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getConsultationReports } from "@/modules/sales-queries";

export default async function ConsultationPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "leads")) redirect(getRoleHome(session.activeRole));

  const { lead: leadId } = await searchParams;
  let initialName = "";
  let initialGoal = "";
  let initialStage = "";
  let initialLeadStage = "";
  const initialReports = await getConsultationReports(session, leadId);

  if (leadId && (await canAccessLead(session, leadId))) {
    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    if (lead) {
      initialName = lead.name;
      initialGoal = lead.notes ?? "";
      initialLeadStage = lead.stage;
      const latestReport = initialReports[0];
      if (latestReport?.stage) initialStage = latestReport.stage;
    }
  }

  return (
    <>
      <PageHeader
        title="CLOSE OS Consultation"
        description="Live discovery, MRI scoring, and objection-aware close — reports save to your leads pipeline."
      />
      <CloseOsApp
        leadId={leadId}
        initialName={initialName}
        initialGoal={initialGoal}
        initialStage={initialStage}
        initialLeadStage={initialLeadStage}
        initialReports={initialReports}
      />
    </>
  );
}
