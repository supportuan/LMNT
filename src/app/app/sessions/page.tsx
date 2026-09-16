import Link from "next/link";
import { redirect } from "next/navigation";
import { ScheduleSessionForm } from "@/components/trainer/schedule-session-form";
import { Badge, DataTable, PageHeader } from "@/components/ui";
import { assertMemberAccess } from "@/lib/access";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getClientWorkspace, getTrainerSessionsList } from "@/modules/trainer-queries";

export default async function TrainerSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.activeRole === "client") {
    redirect("/app/schedule");
  }

  if (!canAccessModule(session.activeRole, "sessions")) redirect(getRoleHome(session.activeRole));

  const { member: memberId } = await searchParams;

  let memberContext: { id: string; name: string; programmeId?: string } | null = null;
  if (memberId) {
    try {
      await assertMemberAccess(session, memberId);
    } catch {
      redirect("/app/sessions");
    }
    const ws = await getClientWorkspace(session, memberId);
    if (ws) {
      memberContext = {
        id: memberId,
        name: ws.member.name,
        programmeId: ws.activeProgramme?.id,
      };
    }
  }

  const rows = await getTrainerSessionsList(session, memberId);
  const isOrgViewer = session.activeRole === "admin" || session.activeRole === "centre_manager";

  return (
    <>
      <PageHeader
        title={memberContext ? `Sessions — ${memberContext.name}` : "Sessions"}
        description={
          memberContext ? (
            <>
              Sessions for this client.{" "}
              <Link href={`/app/clients/${memberContext.id}`} className="text-[var(--workspace-accent)]">
                Back to client
              </Link>
            </>
          ) : isOrgViewer ? (
            "All coaching sessions across branches — review status, trainers, and attendance."
          ) : (
            "Live coaching sessions — start, log, and review performance."
          )
        }
        action={
          memberContext ? (
            <ScheduleSessionForm
              memberId={memberContext.id}
              memberName={memberContext.name}
              programmeId={memberContext.programmeId}
            />
          ) : undefined
        }
      />
      <DataTable
        headers={
          isOrgViewer
            ? ["Client", "Trainer", "Scheduled", "Status", "RPE", "Pain", "Action"]
            : ["Client", "Scheduled", "Status", "RPE", "Pain", "Action"]
        }
        rows={rows.map((s) => {
          const action = (
            <Link
              key={s.id}
              href={`/app/sessions/${s.id}`}
              className="font-medium text-[var(--workspace-accent)]"
            >
              {isOrgViewer || s.status !== "scheduled" ? "Open" : "Start"}
            </Link>
          );
          const scheduled = new Date(s.scheduledAt).toLocaleString();
          const status = (
            <Badge
              key={`${s.id}-status`}
              tone={s.status === "completed" ? "success" : s.status === "in_progress" ? "warning" : "info"}
            >
              {s.status.replace("_", " ")}
            </Badge>
          );
          if (isOrgViewer) {
            return [
              s.memberName,
              s.trainerName ?? "Unassigned",
              scheduled,
              status,
              s.rpe ?? "—",
              s.painFlag ? "Yes" : "No",
              action,
            ];
          }
          return [s.memberName, scheduled, status, s.rpe ?? "—", s.painFlag ? "Yes" : "No", action];
        })}
      />
    </>
  );
}
