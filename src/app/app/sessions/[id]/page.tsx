import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui";
import { assertSessionAccess } from "@/lib/access";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getSessionForCoaching } from "@/modules/trainer-queries";
import { AiCoachCompact } from "@/components/trainer/ai-coach-compact";
import { SessionCoachPanel } from "@/components/trainer/session-coach-panel";

export default async function LiveSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "sessions")) redirect(getRoleHome(session.activeRole));

  try {
    await assertSessionAccess(session, id);
  } catch {
    notFound();
  }

  const data = await getSessionForCoaching(session, id);
  if (!data) notFound();

  return (
    <>
      <div className="mb-6">
        <div className="text-sm text-[var(--workspace-muted)]">Live session</div>
        <h1 className="text-2xl font-bold">{data.memberName}</h1>
        <div className="mt-1 flex gap-2">
          <Badge tone="info">{data.memberGoal ?? "Goal"}</Badge>
          <Badge tone="neutral">{data.programmeTitle ?? "PT Session"}</Badge>
          <Badge tone={data.session.status === "completed" ? "success" : "warning"}>
            {data.session.status}
          </Badge>
        </div>
      </div>

      <SessionCoachPanel
        sessionId={id}
        memberId={data.session.memberId}
        memberName={data.memberName}
        initialStatus={data.session.status}
        initialRpe={data.session.rpe}
        initialPain={data.session.painFlag}
        feedbackNotes={data.feedback?.notes ?? ""}
        initialEnergy={data.feedback?.energy ?? ""}
        exercises={data.defaultExercises}
        savedLogs={data.exerciseLogs}
        workoutOptions={data.workoutOptions}
      />

      <div className="mt-6">
        <AiCoachCompact memberId={data.session.memberId} memberName={data.memberName} />
      </div>
    </>
  );
}
