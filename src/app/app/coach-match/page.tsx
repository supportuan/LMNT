import { redirect } from "next/navigation";
import { CoachMatchApp } from "@/components/prototypes/coach-match-app";
import { PageHeader } from "@/components/ui";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getCoachMatchBoard } from "@/modules/coach-match-queries";

export default async function CoachMatchPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "coach-match")) redirect(getRoleHome(session.activeRole));

  const board = await getCoachMatchBoard(session);

  return (
    <>
      <PageHeader
        title="Find your coach"
        description="Ranked by goal fit, branch, capacity, and verified credentials. Save coaches or request a meeting."
      />
      <CoachMatchApp memberGoal={board.memberGoal} trainers={board.trainers} />
    </>
  );
}
