import { redirect } from "next/navigation";
import { getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  redirect(getRoleHome(session.activeRole));
}
