import { notFound, redirect } from "next/navigation";
import { ClientWorkspaceShell } from "@/components/trainer/client-workspace-shell";
import { assertMemberAccess } from "@/lib/access";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getClientWorkspace } from "@/modules/trainer-queries";

export default async function ClientWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "clients")) redirect(getRoleHome(session.activeRole));

  try {
    await assertMemberAccess(session, memberId);
  } catch {
    notFound();
  }

  const workspace = await getClientWorkspace(session, memberId);
  if (!workspace) notFound();

  return (
    <ClientWorkspaceShell memberId={memberId} workspace={workspace}>
      {children}
    </ClientWorkspaceShell>
  );
}
