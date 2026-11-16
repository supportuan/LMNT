import { redirect } from "next/navigation";
import { AddClientButton } from "@/components/coach-os/add-client";
import { SessionDoneButton } from "@/components/coach-os/session-done";
import { Timetable } from "@/components/coach-os/timetable";
import { EnergyPanel, NonNegotiablesPanel, QuickActions, Top3Panel } from "@/components/coach-os/today-panels";
import { CoachAlerts, CoachLifeHero } from "@/components/trainer/coach-life-hero";
import { Badge, Button, EmptyState, PageHeader } from "@/components/ui";
import { getTrainerLifeConflicts } from "@/lib/coach-life/life-blocks";
import { syncRhythmSessions } from "@/lib/coach-life/rhythm";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getScheduleBlocks, getTrainerClientOptions, getTrainerDashboard } from "@/modules/trainer-queries";

export default async function TodayPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "dashboard")) redirect(getRoleHome(session.activeRole));

  await syncRhythmSessions(session);
  const [data, blocks, clients, lifeConflicts] = await Promise.all([
    getTrainerDashboard(session),
    getScheduleBlocks(session),
    getTrainerClientOptions(session),
    getTrainerLifeConflicts(session),
  ]);

  const alerts = [...data.alerts];
  if (lifeConflicts.length > 0) {
    alerts.unshift({
      message: `${lifeConflicts.length} upcoming session(s) overlap protected life blocks.`,
      tone: "warning",
      href: "/app/calendar",
    });
  }

  const todayList = data.todaySessions.filter((s) => s.status !== "cancelled");
  const nextOpen = todayList.find((s) => s.status === "scheduled" || s.status === "in_progress");
  const occupied = blocks.map((b) => ({ dayOfWeek: b.dayOfWeek, timeSlot: b.timeSlot }));

  return (
    <>
      <PageHeader
        title="Today"
        description="Only what needs your attention now."
        action={
          <div className="flex flex-wrap gap-2">
            <AddClientButton occupied={occupied} />
            <Button href="/app/calendar">Open Week</Button>
          </div>
        }
      />

      <CoachLifeHero
        nextClient={data.nextClient}
        todaySessions={data.stats.todaySessions}
        weekSessions={data.stats.weekSessions}
        followUps={data.stats.followUps}
        loadHours={data.stats.coachingLoadHours}
      />

      <CoachAlerts alerts={alerts} />

      <QuickActions
        occupied={occupied}
        clients={clients}
        nextOpenSession={nextOpen ? { sessionId: nextOpen.id, memberName: nextOpen.memberName } : null}
      />

      <div className="grid gap-[var(--grid-gutter)] xl:grid-cols-[1.45fr_0.55fr]">
        <div className="min-w-0 space-y-[var(--grid-gutter)]">
          <section className="neu-card p-[var(--card-padding)]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold tracking-tight">This week — tap a cell</h2>
              <Button href="/app/calendar" variant="ghost" size="sm">
                Full week →
              </Button>
            </div>
            <Timetable blocks={blocks} clients={clients} compact />
          </section>

          <section className="neu-card p-[var(--card-padding)]">
            <h2 className="mb-4 text-base font-semibold tracking-tight">Today&apos;s sessions</h2>
            {todayList.length === 0 ? (
              <EmptyState
                title="No sessions today"
                description="Book a client into the timetable and their sessions appear here automatically."
              />
            ) : (
              <ul className="divide-y divide-[var(--workspace-border)]">
                {todayList.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{s.memberName}</div>
                      <div className="text-sm text-[var(--workspace-muted)]">
                        {new Date(s.scheduledAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                        {s.programmeTitle ? ` · ${s.programmeTitle}` : ""}
                        {s.painFlag ? " · pain flagged" : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={s.status === "completed" ? "success" : s.status === "in_progress" ? "warning" : "neutral"}>
                        {s.status.replace("_", " ")}
                      </Badge>
                      {s.status !== "completed" && (
                        <>
                          <SessionDoneButton sessionId={s.id} memberName={s.memberName} />
                          <Button href={`/app/sessions/${s.id}`} size="sm">
                            {s.status === "in_progress" ? "Continue" : "Start"}
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-[var(--grid-gutter)]">
          <Top3Panel initial={data.settings.top3} />
          <EnergyPanel score={data.energyScore} message={data.energyMessage} />
          <NonNegotiablesPanel initial={data.settings.nonNegotiables} />
          {data.attention.length > 0 && (
            <section className="neu-card p-[var(--card-padding)]">
              <h2 className="mb-3 text-base font-semibold tracking-tight">Needs attention</h2>
              <ul className="space-y-1">
                {data.attention.slice(0, 5).map((a, i) => (
                  <li key={i}>
                    <a
                      href={a.href ?? "/app/clients"}
                      className="block rounded-[10px] px-2 py-2 text-sm transition hover:bg-[var(--moss-tint)]"
                    >
                      <span className="font-medium">{a.title}</span>
                      <span className="mt-0.5 block text-xs text-[var(--workspace-muted)]">{a.detail}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
