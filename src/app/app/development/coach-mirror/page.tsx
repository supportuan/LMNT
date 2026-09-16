import { redirect } from "next/navigation";
import { CoachMirrorApp } from "@/components/prototypes/coach-mirror-app";
import { PageHeader } from "@/components/ui";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getCoachMirrorHistory } from "@/modules/development-queries";

export default async function CoachMirrorDevPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "development")) redirect(getRoleHome(session.activeRole));

  const history = await getCoachMirrorHistory(session);

  return (
    <>
      <PageHeader
        title="Coach Mirror"
        description="Scenario-based self-assessment — results save to your development history for retake and compare."
      />
      <CoachMirrorApp history={history} />
    </>
  );
}
