import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AdherenceChart,
  SessionRpeChart,
  WeightTrendChart,
} from "@/components/trainer/progress-charts";
import { Badge, PageHeader, Panel } from "@/components/ui";
import { suggestNextBlock } from "@/lib/coach-pro/readiness";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getClientJourney } from "@/modules/queries";
import { getClientWorkspace, getMemberProgressSnapshots, getTrainerClientsEnriched } from "@/modules/trainer-queries";

export default async function ProgressPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "progress")) redirect(getRoleHome(session.activeRole));

  if (session.activeRole === "client") {
    const journey = await getClientJourney(session);
    const member = journey?.member;
    if (!member) {
      return (
        <PageHeader title="Progress" description="Your fitness progress will appear here." />
      );
    }

    const ws = await getClientWorkspace(session, member.id);
    const snapshots = await getMemberProgressSnapshots(member.id);
    const sessions = ws?.sessions ?? [];
    const completed = sessions.filter((s) => s.status === "completed");
    const scheduled = sessions.filter((s) => s.status !== "cancelled");
    const withRpe = completed.filter((s) => s.rpe);
    const avgRpe =
      withRpe.reduce((a, s) => a + (s.rpe ?? 0), 0) / Math.max(1, withRpe.length) || null;
    const painFlags = sessions.filter((s) => s.painFlag).length;

    const weightData = [...snapshots]
      .reverse()
      .filter((s) => s.weight != null)
      .map((s) => ({
        date: new Date(s.recordedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        weight: s.weight!,
      }));

    const rpeData = completed
      .filter((s) => s.rpe)
      .slice(0, 12)
      .reverse()
      .map((s) => ({
        date: new Date(s.scheduledAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        rpe: s.rpe!,
      }));

    const suggestion = suggestNextBlock(completed.length, avgRpe, painFlags);

    return (
      <>
        <PageHeader title="Progress" description="Track your training and body metrics." />
        <Panel title="Coach insight">
          <p className="text-sm text-[var(--workspace-muted)]">{suggestion}</p>
        </Panel>
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Weight trend">
            <WeightTrendChart data={weightData} />
          </Panel>
          <Panel title="Session RPE">
            <SessionRpeChart data={rpeData} />
          </Panel>
        </div>
        <Panel title="Adherence">
          <AdherenceChart scheduled={scheduled.length} completed={completed.length} />
          <dl className="mt-4 grid gap-3 sm:grid-cols-4 text-sm">
            <div>
              <dt className="text-[var(--workspace-muted)]">Goal</dt>
              <dd className="text-xl font-semibold">{member.goal ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--workspace-muted)]">Program</dt>
              <dd className="text-xl font-semibold">{journey?.programme?.title ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--workspace-muted)]">Completed sessions</dt>
              <dd className="text-xl font-semibold">{completed.length}</dd>
            </div>
            <div>
              <dt className="text-[var(--workspace-muted)]">Latest weight</dt>
              <dd className="text-xl font-semibold">{snapshots[0]?.weight ?? "—"} kg</dd>
            </div>
          </dl>
        </Panel>
      </>
    );
  }

  const clients = await getTrainerClientsEnriched(session);

  return (
    <>
      <PageHeader
        title="Progress"
        description="Weight, strength, attendance, personal records, and photos — open a client for the full picture."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {clients.map((c) => (
          <Link key={c.id} href={`/app/clients/${c.id}/progress`} className="block">
            <Panel title={c.name}>
              <Badge
                tone={
                  c.progressStatus === "at_risk"
                    ? "danger"
                    : c.progressStatus === "needs_review"
                      ? "warning"
                      : "success"
                }
              >
                {c.progressStatus.replace("_", " ")}
              </Badge>
              <p className="mt-2 text-sm text-[var(--workspace-muted)]">
                Last session:{" "}
                {c.lastSession ? new Date(c.lastSession).toLocaleDateString() : "None logged"}
              </p>
              <p className="mt-3 text-sm font-medium text-[var(--workspace-accent)]">
                Weight · Strength · Attendance · PRs · Photos →
              </p>
            </Panel>
          </Link>
        ))}
      </div>
    </>
  );
}
