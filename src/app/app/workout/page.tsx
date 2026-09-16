import Link from "next/link";
import { redirect } from "next/navigation";
import { ClientWorkoutSession } from "@/components/client/client-workout-session";
import { Button, PageHeader, Panel } from "@/components/ui";
import { getCurrentWorkoutDay } from "@/lib/coach-pro/workout-day";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getClientJourney } from "@/modules/queries";

export default async function ClientWorkoutPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "workout")) redirect(getRoleHome(session.activeRole));

  const journey = await getClientJourney(session);
  const programme = journey?.programme;
  const weeks = programme?.content?.weeks ?? [];
  const completedCount = journey?.completedSessionCount ?? 0;
  const workout = weeks.length ? getCurrentWorkoutDay(weeks, completedCount) : null;

  return (
    <>
      <PageHeader
        title="Workout"
        description={programme ? programme.title : "Your assigned training program."}
      />
      <Panel title={workout ? `${workout.day.label} · Week ${workout.week.week}` : "Today's training"}>
        {workout ? (
          <ClientWorkoutSession
            workoutLabel={workout.day.label}
            weekLabel={workout.week.label}
            exercises={workout.day.exercises}
          />
        ) : programme?.content?.markdown ? (
          <pre className="whitespace-pre-wrap text-sm">{programme.content.markdown}</pre>
        ) : (
          <p className="text-sm text-[var(--workspace-muted)]">
            Your coach has not published a workout yet.
          </p>
        )}
        {programme && (
          <div className="mt-4 flex gap-2">
            <Button href="/app/schedule" variant="secondary">
              View schedule
            </Button>
            <Link href="/app/progress" className="text-sm font-semibold text-[var(--workspace-accent)]">
              Track progress →
            </Link>
          </div>
        )}
      </Panel>
    </>
  );
}
