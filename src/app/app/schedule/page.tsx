import { redirect } from "next/navigation";
import { ClientSchedulePanel } from "@/components/client/client-schedule-panel";
import { getSession } from "@/lib/session";
import { getRoleHome } from "@/lib/policy";
import { getClientJourney } from "@/modules/queries";

export default async function SchedulePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.activeRole === "trainer" || session.activeRole === "admin") {
    redirect("/app/calendar");
  }

  if (session.activeRole !== "client") {
    redirect(getRoleHome(session.activeRole));
  }

  const journey = await getClientJourney(session);
  const upcoming = journey?.upcomingSessions ?? [];

  return (
    <ClientSchedulePanel
      sessions={upcoming.map((s) => ({
        id: s.id,
        scheduledAt: s.scheduledAt.toISOString(),
        status: s.status,
      }))}
    />
  );
}
