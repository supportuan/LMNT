import Link from "next/link";
import { redirect } from "next/navigation";
import { MemberHubActions } from "@/components/client/member-hub-actions";
import { AdherenceChart, SessionRpeChart, WeightTrendChart } from "@/components/trainer/progress-charts";
import { Badge, Button, PageHeader, Panel, StatCard } from "@/components/ui";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { formatDate } from "@/lib/format";
import { getSession } from "@/lib/session";
import { getMemberHubView } from "@/modules/member-hub-queries";

export const dynamic = "force-dynamic";

export default async function MemberViewPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.activeRole !== "client") redirect(getRoleHome(session.activeRole));
  if (!canAccessModule(session.activeRole, "home")) redirect("/login");

  const hub = await getMemberHubView(session);

  if (!hub) {
    return (
      <PageHeader
        title={`Hello, ${session.name.split(" ")[0]}`}
        description="Your member profile is not linked yet — ask front desk to connect your login."
      />
    );
  }

  const first = session.name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`My view`}
        description={`Screen 7 — goal vs status, timeline, metrics, and self-serve tools for ${first}.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button href="/app/workout" size="sm">
              Workout
            </Button>
            <Button href="/app/progress" variant="secondary" size="sm">
              Full progress
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Goal progress" value={`${hub.goal.goalPct}%`} hint={`${hub.goal.achievedSessions}/${hub.goal.targetSessions} sessions`} accent />
        <StatCard label="Immediate goal" value={hub.goal.immediate.slice(0, 42)} hint={hub.goal.longTerm} />
        <StatCard label="Capability" value={hub.capabilityScore ?? "—"} hint="From intake" />
        <StatCard label="Program" value={hub.programme?.title ?? "—"} hint={hub.programWeeks ? `${hub.programWeeks} weeks` : undefined} />
      </div>

      <Panel title="Goal vs current status" elevated>
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-[var(--workspace-border)]">
          <div
            className="h-full rounded-full bg-[var(--workspace-accent)] transition-all"
            style={{ width: `${hub.goal.goalPct}%` }}
          />
        </div>
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-[var(--workspace-muted)]">Target (sessions)</dt>
            <dd className="font-semibold">{hub.goal.targetSessions}</dd>
          </div>
          <div>
            <dt className="text-[var(--workspace-muted)]">Achieved</dt>
            <dd className="font-semibold">{hub.goal.achievedSessions}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[var(--workspace-muted)]">Long-term</dt>
            <dd>{hub.goal.longTerm}</dd>
          </div>
        </dl>
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Weekly review">
          <p className="text-sm">{hub.weeklyReview.summary}</p>
          <ul className="mt-3 space-y-1 text-sm text-[var(--workspace-muted)]">
            <li>Sessions (7d): {hub.weeklyReview.sessionsCompleted}</li>
            {hub.weeklyReview.avgCalories != null && <li>Avg calories logged: {hub.weeklyReview.avgCalories} kcal</li>}
            {hub.weeklyReview.latestRecovery != null && <li>Latest recovery: {hub.weeklyReview.latestRecovery}%</li>}
            {hub.weeklyReview.latestSleep != null && <li>Latest sleep: {hub.weeklyReview.latestSleep}h</li>}
          </ul>
        </Panel>

        <Panel title="Notifications & events">
          {hub.notifications.length === 0 ? (
            <p className="text-sm text-[var(--workspace-muted)]">No alerts right now.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {hub.notifications.map((n) => (
                <li key={n.id}>
                  {n.href ? (
                    <Link href={n.href} className="font-medium hover:text-[var(--workspace-accent)]">
                      {n.title}
                    </Link>
                  ) : (
                    <span className="font-medium">{n.title}</span>
                  )}
                  <p className="text-[var(--workspace-muted)]">{n.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Partner offers">
          {hub.offers.length === 0 ? (
            <p className="text-sm text-[var(--workspace-muted)]">No active offers.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {hub.offers.map((o) => (
                <li key={o.id}>
                  <span className="font-medium">{o.title}</span>
                  <span className="text-[var(--workspace-muted)]"> · {o.partnerName}</span>
                </li>
              ))}
            </ul>
          )}
          <Button href="/app/community" variant="secondary" size="sm" className="mt-3">
            View all
          </Button>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Program visibility">
          {hub.programme ? (
            <>
              <p className="font-medium">{hub.programme.title}</p>
              <p className="mt-1 text-sm text-[var(--workspace-muted)]">
                Status: <Badge tone="success">{hub.programme.status}</Badge>
                {hub.programme.content?.goal ? ` · ${hub.programme.content.goal}` : ""}
              </p>
              {hub.programme.content?.weeks?.length ? (
                <ul className="mt-3 max-h-40 overflow-y-auto text-sm">
                  {hub.programme.content.weeks.slice(0, 4).map((w) => (
                    <li key={w.week} className="border-b border-[var(--workspace-border)] py-1">
                      Week {w.week}: {w.label}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-[var(--workspace-muted)]">Coach has not published week detail yet.</p>
              )}
              <Button href="/app/workout" className="mt-3" size="sm">
                Open workout
              </Button>
            </>
          ) : (
            <p className="text-sm text-[var(--workspace-muted)]">No active programme assigned.</p>
          )}
        </Panel>

        <Panel title="Timeline vs sessions">
          <ul className="max-h-52 space-y-2 overflow-y-auto text-sm">
            {hub.timeline.map((e) => (
              <li key={e.id} className="flex justify-between gap-2 border-b border-[var(--workspace-border)] pb-1">
                <span>
                  <span className="font-medium">{e.title}</span>
                  {e.detail ? <span className="text-[var(--workspace-muted)]"> — {e.detail}</span> : null}
                </span>
                <span className="shrink-0 text-xs text-[var(--workspace-muted)]">
                  {formatDate(e.occurredAt)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[var(--workspace-muted)]">
            Next:{" "}
            {hub.upcomingSessions[0]
              ? new Date(hub.upcomingSessions[0].scheduledAt).toLocaleString()
              : "No sessions scheduled"}
          </p>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Progress — weight">
          <WeightTrendChart data={hub.charts.weight} />
        </Panel>
        <Panel title="Progress — session RPE">
          <SessionRpeChart data={hub.charts.rpe} />
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Adherence snapshot">
          <AdherenceChart scheduled={hub.goal.targetSessions} completed={hub.goal.achievedSessions} />
        </Panel>
      </div>

      {(hub.vacations.length > 0 || hub.wearables.length > 0 || hub.questions.length > 0) && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {hub.vacations.length > 0 && (
            <Panel title="Upcoming vacations">
              <ul className="text-sm">
                {hub.vacations.map((v) => (
                  <li key={v.id}>
                    {v.startsAt} → {v.endsAt}
                    {v.notes ? ` · ${v.notes}` : ""}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {hub.wearables.length > 0 && (
            <Panel title="Recent wearables">
              <ul className="text-sm">
                {hub.wearables.slice(0, 5).map((w) => (
                  <li key={w.id}>
                    {w.source} · recovery {w.recovery ?? "—"}% · sleep {w.sleepHours ?? "—"}h
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {hub.questions.length > 0 && (
            <Panel title="Coach questions">
              <ul className="text-sm">
                {hub.questions.map((q) => (
                  <li key={q.id}>
                    <Badge tone={q.status === "open" ? "warning" : "success"}>{q.status}</Badge> {q.question.slice(0, 80)}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--workspace-muted)]">
          Log & plan
        </h2>
        <MemberHubActions />
      </div>

      {hub.trainer && (
        <p className="mt-6 text-xs text-[var(--workspace-muted)]">
          Your coach: {hub.trainer.trainerName} · Messages in{" "}
          <Link href="/app/messages" className="text-[var(--workspace-accent)]">
            Messages
          </Link>
        </p>
      )}
    </>
  );
}