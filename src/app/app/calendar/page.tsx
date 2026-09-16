import { redirect } from "next/navigation";
import { Badge, DataTable, PageHeader, Panel } from "@/components/ui";
import { KineticCalendarView } from "@/components/trainer/kinetic-calendar";
import { LifeConflictsPanel } from "@/components/trainer/life-conflicts-panel";
import { WeekTimetablePanel } from "@/components/trainer/week-timetable-panel";
import { assetDisplayLabel, assetDisplayStatus } from "@/lib/assets";
import { getTrainerLifeConflicts } from "@/lib/coach-life/life-blocks";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getAssetTrainers } from "@/modules/admin-queries";
import {
  getOrgCalendarClients,
  getOrgCalendarEvents,
  getTrainerCalendarClients,
  getTrainerCalendarEvents,
} from "@/modules/calendar-queries";
import { getAssets } from "@/modules/queries";
import { getScheduleBlocks, getTrainerLeads } from "@/modules/trainer-queries";

export default async function CalendarPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "calendar")) redirect(getRoleHome(session.activeRole));

  if (session.activeRole === "admin" || session.activeRole === "centre_manager") {
    const [events, clients, trainers, assets] = await Promise.all([
      getOrgCalendarEvents(session),
      getOrgCalendarClients(session),
      getAssetTrainers(session),
      getAssets(session),
    ]);

    return (
      <div className="space-y-6">
        <PageHeader
          title="Schedule"
          description="Trainer schedules, sessions, and equipment availability."
        />
        <Panel title="Equipment availability">
          <DataTable
            headers={["Asset", "Location", "Status", "Assigned"]}
            rows={assets.map((asset) => {
              const display = assetDisplayStatus(asset);
              return [
                asset.name,
                asset.location ?? asset.assignedArea ?? "—",
                <Badge
                  key={`${asset.id}-status`}
                  tone={
                    display === "available"
                      ? "success"
                      : display === "in_use"
                        ? "info"
                        : display === "maintenance"
                          ? "warning"
                          : display === "retired"
                            ? "neutral"
                            : "danger"
                  }
                >
                  {assetDisplayLabel(display)}
                </Badge>,
                asset.assignedTrainerName ?? "Floor",
              ];
            })}
          />
        </Panel>
        <div className="-mx-6 md:-mx-8">
          <KineticCalendarView events={events} clients={clients} pendingLeads={[]} trainers={trainers} />
        </div>
      </div>
    );
  }

  const [events, clients, leads, blocks, conflicts] = await Promise.all([
    getTrainerCalendarEvents(session),
    getTrainerCalendarClients(session),
    getTrainerLeads(session),
    getScheduleBlocks(session),
    getTrainerLifeConflicts(session),
  ]);

  const pendingLeads = leads.filter((l) =>
    ["new", "consultation", "trial"].includes(l.stage),
  );

  return (
    <div className="-mx-6 -mt-6 md:-mx-8 md:-mt-8">
      <div className="space-y-6 px-6 pt-6 md:px-8">
        <PageHeader
          title="Week"
          description="Your timetable, protected life blocks, and session rhythm."
        />
        <LifeConflictsPanel conflicts={conflicts} />
        <WeekTimetablePanel blocks={blocks} />
      </div>
      <KineticCalendarView events={events} clients={clients} pendingLeads={pendingLeads} />
    </div>
  );
}
