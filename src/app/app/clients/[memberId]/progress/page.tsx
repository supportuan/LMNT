import { redirect } from "next/navigation";
import {
  AdherenceChart,
  SessionRpeChart,
  WeightTrendChart,
} from "@/components/trainer/progress-charts";
import { ProgressSnapshotForm } from "@/components/trainer/progress-snapshot-form";
import { Panel } from "@/components/ui";
import { assertMemberAccess } from "@/lib/access";
import { suggestNextBlock } from "@/lib/coach-pro/readiness";
import { getSession } from "@/lib/session";
import {
  getClientWorkspace,
  getMemberAttendanceHistory,
  getMemberPersonalRecords,
  getMemberProgressSnapshots,
} from "@/modules/trainer-queries";

export default async function ClientProgressTab({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  await assertMemberAccess(session, memberId);

  const [ws, snapshots, records, attendance] = await Promise.all([
    getClientWorkspace(session, memberId),
    getMemberProgressSnapshots(memberId),
    getMemberPersonalRecords(memberId),
    getMemberAttendanceHistory(memberId),
  ]);
  const sessions = ws?.sessions ?? [];
  const completed = sessions.filter((s) => s.status === "completed");
  const scheduled = sessions.filter((s) => s.status !== "cancelled");
  const withRpe = completed.filter((s) => s.rpe);
  const avgRpe =
    withRpe.reduce((a, s) => a + (s.rpe ?? 0), 0) / Math.max(1, withRpe.length) || null;
  const painFlags = sessions.filter((s) => s.painFlag).length;
  const isTrainer = session.activeRole === "trainer" || session.activeRole === "admin";
  const photos = snapshots.flatMap((s) => s.photos ?? []);
  const checkInCount = attendance.checkIns.length;
  const sessionRate = attendance.sessions.length
    ? Math.round(
        (attendance.sessions.filter((s) => s.status === "completed").length / attendance.sessions.length) * 100,
      )
    : 0;

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
    <div className="space-y-4">
      <Panel title="Coach insight">
        <p className="text-sm">{suggestion}</p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Weight trend">
          <WeightTrendChart data={weightData} />
        </Panel>
        <Panel title="Strength improvements">
          {records.length === 0 ? (
            <p className="text-sm text-[var(--workspace-muted)]">
              Log weights in sessions to see strength changes.
            </p>
          ) : (
            <div className="space-y-3">
              {records.slice(0, 6).map((r) => {
                const delta = r.latestLoad - r.firstLoad;
                return (
                  <div key={r.exerciseName} className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{r.exerciseName}</div>
                      <div className="text-xs text-[var(--workspace-muted)]">
                        {r.firstLoad} → {r.latestLoad} kg
                      </div>
                    </div>
                    <span className={delta >= 0 ? "font-mono text-[var(--status-success)]" : "font-mono text-[var(--status-danger)]"}>
                      {delta >= 0 ? "+" : ""}
                      {delta} kg
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Attendance">
          <AdherenceChart scheduled={scheduled.length} completed={completed.length} />
          <p className="mt-3 text-sm text-[var(--workspace-muted)]">
            Session completion {sessionRate}% · {checkInCount} gym check-ins
          </p>
        </Panel>
        <Panel title="Personal records">
          {records.length === 0 ? (
            <p className="text-sm text-[var(--workspace-muted)]">No PRs logged yet.</p>
          ) : (
            <div className="space-y-2">
              {records.slice(0, 8).map((r) => (
                <div key={r.exerciseName} className="flex justify-between text-sm">
                  <span>{r.exerciseName}</span>
                  <span className="font-mono">
                    {r.bestLoad} kg · {r.bestReps}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Session RPE">
        <SessionRpeChart data={rpeData} />
      </Panel>

      <Panel title="Progress photos">
        {photos.length === 0 ? (
          <p className="text-sm text-[var(--workspace-muted)]">No photos uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt={`Progress ${i + 1}`} className="h-36 w-full rounded-lg object-cover" />
            ))}
          </div>
        )}
        {isTrainer && (
          <div className="mt-4">
            <ProgressSnapshotForm memberId={memberId} mode="photos" />
          </div>
        )}
      </Panel>

      {isTrainer && (
        <Panel title="Record metrics">
          <ProgressSnapshotForm memberId={memberId} />
        </Panel>
      )}
    </div>
  );
}
