import { redirect } from "next/navigation";
import { Panel } from "@/components/ui";
import { assertMemberAccess } from "@/lib/access";
import { getSession } from "@/lib/session";
import { getClientWorkspace } from "@/modules/trainer-queries";

export default async function ClientSessionsTab({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  await assertMemberAccess(session, memberId);

  const ws = await getClientWorkspace(session, memberId);

  return (
    <Panel title="Sessions">
      <div className="space-y-2">
        {ws?.sessions.map((s) => (
          <div
            key={s.id}
            className="flex justify-between rounded-md border border-[var(--workspace-border)] px-4 py-3 text-sm"
          >
            <span>{new Date(s.scheduledAt).toLocaleString()}</span>
            <span className="capitalize">{s.status}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
