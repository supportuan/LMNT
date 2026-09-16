import { redirect } from "next/navigation";
import { DataTable, PageHeader } from "@/components/ui";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getAuditLog } from "@/modules/queries";

export default async function AuditPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "audit")) redirect(getRoleHome(session.activeRole));

  const entries = await getAuditLog(session);

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Append-only record of high-impact decisions in your scope."
      />
      <DataTable
        headers={["When", "Action", "Resource", "Actor role"]}
        rows={entries.map((entry) => [
          new Date(entry.createdAt).toLocaleString(),
          entry.action,
          entry.resourceType,
          entry.actorRole ?? "—",
        ])}
      />
    </>
  );
}
