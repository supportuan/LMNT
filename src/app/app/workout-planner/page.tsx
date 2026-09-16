import { redirect } from "next/navigation";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";

export default async function WorkoutPlannerRedirectPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "workout-planner")) redirect(getRoleHome(session.activeRole));
  redirect("/app/programs");
}
