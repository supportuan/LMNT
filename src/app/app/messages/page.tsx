import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ClientMessagesPanel } from "@/components/client/client-messages-panel";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { members, messages } from "@/db/schema";

export default async function ClientMessagesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "messages")) redirect(getRoleHome(session.activeRole));

  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.userId, session.userId))
    .limit(1);

  const initialMessages = member
    ? await db
        .select()
        .from(messages)
        .where(eq(messages.memberId, member.id))
        .orderBy(desc(messages.createdAt))
        .limit(50)
    : [];

  return (
    <ClientMessagesPanel
      userId={session.userId}
      initialMessages={initialMessages.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      }))}
    />
  );
}
