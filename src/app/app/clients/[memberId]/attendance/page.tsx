import { redirect } from "next/navigation";
import { Panel } from "@/components/ui";
import { assertMemberAccess } from "@/lib/access";
import { getSession } from "@/lib/session";
import { getMemberAttendanceHistory } from "@/modules/trainer-queries";

export default async function ClientAttendanceTab({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  await assertMemberAccess(session, memberId);

  const { checkIns, sessions } = await getMemberAttendanceHistory(memberId);
  const completed = sessions.filter((s) => s.status === "completed").length;
  const rate = sessions.length ? Math.round((completed / sessions.length) * 100) : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Attendance">
        <p className="mb-4 text-sm text-[var(--workspace-muted)]">
          Session show-up rate {rate}% · {completed} of {sessions.length} sessions completed.
        </p>
        <div className="space-y-2">
          {sessions.length === 0 ? (
            <p className="text-sm text-[var(--workspace-muted)]">No sessions yet.</p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className="flex justify-between rounded-md border border-[var(--workspace-border)] px-4 py-3 text-sm"
              >
                <span>{new Date(s.scheduledAt).toLocaleString()}</span>
                <span className="capitalize">{s.status.replace("_", " ")}</span>
              </div>
            ))
          )}
        </div>
      </Panel>
      <Panel title="Gym check-ins">
        {checkIns.length === 0 ? (
          <p className="text-sm text-[var(--workspace-muted)]">No floor check-ins recorded.</p>
        ) : (
          <div className="space-y-2">
            {checkIns.map((row) => (
              <div
                key={row.id}
                className="flex justify-between rounded-md border border-[var(--workspace-border)] px-4 py-3 text-sm"
              >
                <span>{new Date(row.checkedInAt).toLocaleString()}</span>
                <span className="uppercase text-[var(--workspace-muted)]">{row.method}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
