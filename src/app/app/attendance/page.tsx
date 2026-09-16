import { redirect } from "next/navigation";
import { AttendanceCheckInPanel } from "@/components/client/attendance-check-in-panel";
import { PageHeader, Panel } from "@/components/ui";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getClientAttendance } from "@/modules/queries";

export default async function AttendancePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "attendance")) redirect(getRoleHome(session.activeRole));

  const history = await getClientAttendance(session);

  return (
    <>
      <PageHeader title="Check-in" description="Log your gym attendance." />
      <AttendanceCheckInPanel />
      <Panel title="Recent check-ins" elevated>
        {history.length === 0 ? (
          <p className="text-sm text-[var(--workspace-muted)]">No check-ins yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {history.map((r) => (
              <li key={r.id} className="flex justify-between border-b py-2">
                <span>{new Date(r.checkedInAt).toLocaleString()}</span>
                <span className="capitalize text-[var(--workspace-muted)]">{r.method}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
