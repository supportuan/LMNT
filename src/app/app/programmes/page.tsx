import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getRoleHome } from "@/lib/policy";

export default async function ProgrammesRedirect() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.activeRole === "trainer") redirect("/app/programs");
  redirect("/app/workout");
}
