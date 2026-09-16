import { redirect } from "next/navigation";
import { Panel } from "@/components/ui";
import { CoachNotesEditor } from "@/components/trainer/coach-notes-editor";
import { assertMemberAccess } from "@/lib/access";
import { getSession } from "@/lib/session";
import { getMemberNotes } from "@/modules/trainer-queries";

export default async function ClientNotesTab({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.activeRole === "client") redirect("/app/home");
  await assertMemberAccess(session, memberId);

  const notes = await getMemberNotes(memberId);

  return (
    <Panel title="Notes">
      <p className="mb-4 text-sm text-[var(--workspace-muted)]">
        Internal trainer notes — not visible to the client.
      </p>
      <CoachNotesEditor memberId={memberId} initialNotes={notes} />
    </Panel>
  );
}
