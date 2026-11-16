import Link from "next/link";
import { redirect } from "next/navigation";
import { AddClientButton } from "@/components/coach-os/add-client";
import { Timetable } from "@/components/coach-os/timetable";
import { BookBanner, ProtectLifeButton } from "@/components/coach-os/week-actions";
import { Badge, DataTable, PageHeader, Panel } from "@/components/ui";
import { KineticCalendarView } from "@/components/trainer/kinetic-calendar";
import { LifeConflictsPanel } from "@/components/trainer/life-conflicts-panel";
import { assetDisplayLabel, assetDisplayStatus } from "@/lib/assets";
import { getTrainerLifeConflicts } from "@/lib/coach-life/life-blocks";
import { syncRhythmSessions } from "@/lib/coach-life/rhythm";
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
import { getScheduleBlocks, getTrainerClientOptions, getTrainerLeads } from "@/modules/trainer-queries";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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

  const params = await searchParams;
  const view = params.view === "calendar" ? "calendar" : "timetable";
  const bookId = typeof params.book === "string" ? params.book : null;

  await syncRhythmSessions(session);
  const [blocks, clientOptions, conflicts] = await Promise.all([
    getScheduleBlocks(session),
    getTrainerClientOptions(session),
    getTrainerLifeConflicts(session),
  ]);
  const occupied = blocks.map((b) => ({ dayOfWeek: b.dayOfWeek, timeSlot: b.timeSlot }));
  const bookClient = bookId ? clientOptions.find((c) => c.id === bookId) : undefined;

  const header = (
    <PageHeader
      title="Week"
      description="Your rhythm decides your life. Tap any slot to book a client or protect time."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <ProtectLifeButton />
          <AddClientButton occupied={occupied} label="+ Book Client" />
        </div>
      }
    />
  );

  const viewSwitch = (
    <nav aria-label="Week view" className="neu-inset mb-5 inline-flex gap-1 rounded-[14px] p-1.5">
      {(
        [
          ["timetable", "Timetable", "/app/calendar"],
          ["calendar", "Dated calendar", "/app/calendar?view=calendar"],
        ] as const
      ).map(([id, label, href]) => (
        <Link
          key={id}
          href={href}
          aria-current={view === id ? "page" : undefined}
          className={`rounded-[10px] px-3 py-1.5 text-sm font-medium transition ${
            view === id
              ? "bg-[var(--workspace-accent)] text-[var(--workspace-accent-text)]"
              : "text-[var(--workspace-muted)] hover:text-[var(--workspace-text)]"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );

  if (view === "calendar") {
    const [events, clients, leads] = await Promise.all([
      getTrainerCalendarEvents(session),
      getTrainerCalendarClients(session),
      getTrainerLeads(session),
    ]);
    const pendingLeads = leads.filter((l) => ["new", "consultation", "trial"].includes(l.stage));
    return (
      <div className="-mx-6 -mt-6 md:-mx-8 md:-mt-8">
        <div className="px-6 pt-6 md:px-8">
          {header}
          {viewSwitch}
        </div>
        <KineticCalendarView events={events} clients={clients} pendingLeads={pendingLeads} />
      </div>
    );
  }

  return (
    <>
      {header}
      {viewSwitch}
      {bookClient && <BookBanner name={bookClient.name} />}
      <LifeConflictsPanel conflicts={conflicts} />
      <section className="neu-card p-[var(--card-padding)]">
        <Timetable blocks={blocks} clients={clientOptions} bookMemberId={bookClient?.id ?? null} />
      </section>
    </>
  );
}
