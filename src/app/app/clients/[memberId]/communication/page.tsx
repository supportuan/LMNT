import { redirect } from "next/navigation";
import { Panel } from "@/components/ui";
import { CommunicationPanel } from "@/components/trainer/communication-panel";
import { assertMemberAccess } from "@/lib/access";
import { getSession } from "@/lib/session";
import { getMemberCheckIns, getMemberMessages } from "@/modules/trainer-queries";

export default async function ClientCommunicationTab({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  await assertMemberAccess(session, memberId);

  const [msgs, checkIns] = await Promise.all([
    getMemberMessages(memberId),
    getMemberCheckIns(memberId),
  ]);

  return (
    <Panel title="Communication">
      <CommunicationPanel
        memberId={memberId}
        trainerUserId={session.activeRole === "trainer" ? session.userId : msgs[0]?.trainerId ?? ""}
        initialMessages={msgs}
        initialCheckIns={checkIns}
        isTrainer={session.activeRole === "trainer" || session.activeRole === "admin"}
      />
    </Panel>
  );
}
