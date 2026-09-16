import { redirect } from "next/navigation";
import { CommunityHub } from "@/components/community/community-hub";
import { PageHeader } from "@/components/ui";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getCommunityGroups, getPartnerCatalogue } from "@/modules/community-queries";

export default async function CommunityPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "community")) redirect(getRoleHome(session.activeRole));

  const [partners, groups] = await Promise.all([
    getPartnerCatalogue(session),
    getCommunityGroups(session),
  ]);

  return (
    <>
      <PageHeader
        title="Community"
        description="Member perks from LMNT partners and branch community groups."
      />
      <CommunityHub partners={partners} groups={groups} />
    </>
  );
}
