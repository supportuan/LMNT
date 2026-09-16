import Link from "next/link";
import { redirect } from "next/navigation";
import { CoachLifeHero } from "@/components/trainer/coach-life-hero";
import { SessionDoneButton } from "@/components/trainer/session-done-button";
import {
  KpiIconCheckIn,
  KpiIconSessions,
  KpiIconUsers,
} from "@/components/dashboard/kpi-icons";
import { Badge, Button, PageHeader, Panel, StatCard } from "@/components/ui";
import { getTrainerLifeConflicts } from "@/lib/coach-life/life-blocks";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getTrainerDashboard } from "@/modules/trainer-queries";

export default async function TrainerDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "dashboard")) redirect(getRoleHome(session.activeRole));

  const [data, lifeConflicts] = await Promise.all([
    getTrainerDashboard(session),
    getTrainerLifeConflicts(session),
  ]);
  const alerts = [...data.alerts];
  if (lifeConflicts.length > 0) {
    alerts.push({
      message: `${lifeConflicts.length} upcoming session(s) overlap protected life blocks.`,
      tone: "warning",
    });
  }
  const hour = new Date().getHours();
  const salutation = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstOpenSession = data.todaySessions.find((s) => s.status !== "completed");

  return (
    <>
      <PageHeader
        title={`${salutation}, ${data.greeting}`}
        description="Today’s overview — sessions, clients, and what needs you next."
      />

      <CoachLifeHero
        nextClient={data.nextClient}
        energyScore={data.energyScore}
        alerts={alerts}
        weekSessions={data.stats.weekSessions}
        todaySessions={data.stats.todaySessions}
        followUps={data.stats.followUps}
      />

      <div className="mb-6 grid gap-[var(--grid-gutter)] sm:grid-cols-3">
        <StatCard label="Sessions today" value={data.stats.todaySessions} icon={<KpiIconSessions />} />
        <StatCard label="Active clients" value={data.stats.activeClients} icon={<KpiIconUsers />} />
        <Link href="/app/tasks" className="block transition hover:opacity-90">
          <StatCard label="Pending tasks" value={data.stats.pendingTasks} icon={<KpiIconCheckIn />} />
        </Link>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="Today’s Schedule">
          {data.todaySessions.length === 0 ? (
            <p className="text-sm text-[var(--workspace-muted)]">No sessions scheduled today.</p>
          ) : (
            <div className="space-y-3">
              {data.todaySessions.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--workspace-border)] p-4"
                >
                  <div>
                    <div className="font-semibold">{s.memberName}</div>
                    <div className="text-sm text-[var(--workspace-muted)]">
                      {new Date(s.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {s.programmeTitle ? ` · ${s.programmeTitle}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={s.status === "completed" ? "success" : s.status === "in_progress" ? "warning" : "info"}>
                      {s.status.replace("_", " ")}
                    </Badge>
                    {s.status !== "completed" && (
                      <>
                        <SessionDoneButton sessionId={s.id} memberName={s.memberName} />
                        <Button href={`/app/sessions/${s.id}`} size="sm">
                          {s.status === "in_progress" ? "Continue" : "Start Session"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Quick actions">
          <div className="grid gap-2">
            <Button href="/app/clients?new=1" className="min-h-12 w-full">
              Add Client
            </Button>
            <Button
              href={firstOpenSession ? `/app/sessions/${firstOpenSession.id}` : "/app/sessions"}
              variant="secondary"
              className="min-h-12 w-full"
            >
              Start Session
            </Button>
            <Button href="/app/programs" variant="secondary" className="min-h-12 w-full">
              Create Workout
            </Button>
          </div>
          {data.attention.length > 0 && (
            <div className="mt-6 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--workspace-muted)]">
                Pending
              </div>
              {data.attention.slice(0, 4).map((a, i) => (
                <Link key={i} href={a.href ?? "/app/clients"} className="block text-sm hover:text-[var(--workspace-accent)]">
                  {a.title}
                  <span className="mt-0.5 block text-xs text-[var(--workspace-muted)]">{a.detail}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
