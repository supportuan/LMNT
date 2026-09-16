import { redirect } from "next/navigation";
import Link from "next/link";
import { PartnersAdminPanel } from "@/components/community/partners-admin-panel";
import { PageHeader } from "@/components/ui";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getCentresForSession } from "@/modules/queries";
import { getServiceAgreements } from "@/modules/community-queries";

export default async function PartnersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "partners")) redirect(getRoleHome(session.activeRole));

  const [agreements, centres] = await Promise.all([
    getServiceAgreements(session),
    getCentresForSession(session),
  ]);

  return (
    <>
      <PageHeader
        title="Partners & agreements"
        description="Commerce partners, member perks, and monthly service agreement reviews."
        action={
          <Link href="/app/community" className="text-sm font-semibold text-[var(--workspace-accent)]">
            Member view →
          </Link>
        }
      />
      <PartnersAdminPanel
        agreements={agreements}
        centres={centres.map((c) => ({ id: c.id, name: c.name }))}
      />
    </>
  );
}
