import { redirect } from "next/navigation";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";

export default async function CloseOsRedirectPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "close-os")) redirect(getRoleHome(session.activeRole));
  redirect("/app/leads/consultation");
}
