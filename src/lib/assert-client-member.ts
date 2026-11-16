import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members } from "@/db/schema";
import type { SessionPayload } from "@/lib/session";

export async function getClientLinkedMember(session: SessionPayload) {
  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.userId, session.userId))
    .limit(1);
  if (!member || member.organisationId !== session.organisationId) return null;
  return member;
}

export async function requireClientMember(session: SessionPayload) {
  const member = await getClientLinkedMember(session);
  if (!member) throw new Error("No member profile linked");
  return member;
}