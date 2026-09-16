import { redirect } from "next/navigation";
import { Badge, DataTable, PageHeader } from "@/components/ui";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getClientAssessments } from "@/modules/queries";

export default async function AssessmentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "assessments")) redirect(getRoleHome(session.activeRole));

  const items = await getClientAssessments(session);

  return (
    <>
      <PageHeader title="Assessments" description="Your health readiness and movement screening results." />
      <DataTable
        headers={["Status", "PAR-Q", "Referral", "Completed"]}
        rows={items.map((item) => [
          <Badge key={item.id} tone={item.status === "completed" ? "success" : "info"}>
            {item.status}
          </Badge>,
          item.parqCleared ? "Cleared" : "Pending",
          item.referralRequired ? "Required" : "No",
          item.completedAt ? new Date(item.completedAt).toLocaleDateString() : "—",
        ])}
      />
    </>
  );
}
