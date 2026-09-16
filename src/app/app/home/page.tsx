import { redirect } from "next/navigation";
import { Button, PageHeader, Panel, StatCard } from "@/components/ui";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getClientJourney } from "@/modules/queries";

export default async function ClientHomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "home")) redirect(getRoleHome(session.activeRole));

  const journey = await getClientJourney(session);
  if (!journey) {
    return (
      <PageHeader
        title={`Good morning, ${session.name.split(" ")[0]}`}
        description="Your coach will set up your program soon."
      />
    );
  }

  const { member, programme, upcomingSessions, assessment } = journey;

  return (
    <>
      <PageHeader
        title={`Good morning, ${session.name.split(" ")[0]}`}
        description="What you need for your fitness today."
        action={<Button href="/app/workout">Start workout</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Current goal" value={member.goal ?? "—"} />
        <StatCard label="Active program" value={programme?.title ?? "—"} />
        <StatCard label="Upcoming sessions" value={upcomingSessions.length} />
        <StatCard label="Assessment" value={assessment?.status ?? "—"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Today's workout">
          <p className="text-sm text-[var(--workspace-muted)]">
            {programme
              ? `Your coach has assigned: ${programme.title}`
              : "No workout assigned yet."}
          </p>
          <Button href="/app/workout" className="mt-4">
            Start workout
          </Button>
        </Panel>
        <Panel title="Next session">
          {upcomingSessions[0] ? (
            <p className="text-sm">
              {new Date(upcomingSessions[0].scheduledAt).toLocaleString()}
            </p>
          ) : (
            <p className="text-sm text-[var(--workspace-muted)]">No upcoming sessions.</p>
          )}
        </Panel>
      </div>
    </>
  );
}
