import { redirect } from "next/navigation";
import { ProfileGoalForm } from "@/components/client/profile-goal-form";
import { PageHeader, Panel } from "@/components/ui";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getClientJourney } from "@/modules/queries";

export default async function ClientProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "profile")) redirect(getRoleHome(session.activeRole));

  const journey = await getClientJourney(session);
  const member = journey?.member;

  return (
    <>
      <PageHeader title="Profile" description="Your account and fitness profile." />
      <Panel title="Details">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--workspace-muted)]">Name</dt>
            <dd className="font-medium">{session.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--workspace-muted)]">Email</dt>
            <dd className="font-medium">{session.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--workspace-muted)]">Goal</dt>
            <dd className="font-medium">{member?.goal ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--workspace-muted)]">Status</dt>
            <dd className="font-medium capitalize">{member?.status ?? "—"}</dd>
          </div>
        </dl>
        <ProfileGoalForm initialGoal={member?.goal ?? null} />
      </Panel>
    </>
  );
}
