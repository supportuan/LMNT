import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { members, programmes, sessions, tasks, users } from "@/db/schema";
import type { CalendarClient, CalendarEvent } from "@/lib/calendar-utils";
import { DEFAULT_SESSION_MINS, DEFAULT_TASK_MINS, addMinutes } from "@/lib/calendar-utils";
import { orgAndCentreScope } from "@/lib/branch-scope";
import type { SessionPayload } from "@/lib/session";

export async function getTrainerCalendarEvents(session: SessionPayload): Promise<CalendarEvent[]> {
  const sessionRows = await db
    .select({
      id: sessions.id,
      scheduledAt: sessions.scheduledAt,
      status: sessions.status,
      memberId: sessions.memberId,
      memberName: members.name,
      programmeTitle: programmes.title,
    })
    .from(sessions)
    .innerJoin(members, eq(sessions.memberId, members.id))
    .leftJoin(programmes, eq(sessions.programmeId, programmes.id))
    .where(
      and(eq(sessions.organisationId, session.organisationId), eq(sessions.trainerId, session.userId)),
    )
    .orderBy(sessions.scheduledAt);

  const taskRows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.organisationId, session.organisationId), eq(tasks.ownerId, session.userId)))
    .orderBy(tasks.dueAt);

  const sessionEvents: CalendarEvent[] = sessionRows.map((row) => {
    const start = row.scheduledAt;
    const end = addMinutes(start, DEFAULT_SESSION_MINS);
    return {
      id: row.id,
      type: "session",
      title: row.memberName,
      subtitle: row.programmeTitle ?? "PT Session",
      start: start.toISOString(),
      end: end.toISOString(),
      status: row.status,
      memberId: row.memberId,
      href: `/app/sessions/${row.id}`,
    };
  });

  const taskEvents: CalendarEvent[] = taskRows
    .filter((t) => t.dueAt)
    .map((row) => {
      const start = row.dueAt!;
      const end = addMinutes(start, DEFAULT_TASK_MINS);
      return {
        id: row.id,
        type: "task",
        title: row.title,
        subtitle: row.description ?? "Task",
        start: start.toISOString(),
        end: end.toISOString(),
        status: row.status,
        href: "/app/tasks",
      };
    });

  return [...sessionEvents, ...taskEvents].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
}

export async function getTrainerCalendarClients(session: SessionPayload): Promise<CalendarClient[]> {
  const { coachingRelationships } = await import("@/db/schema");
  const rows = await db
    .select({
      id: members.id,
      name: members.name,
    })
    .from(coachingRelationships)
    .innerJoin(members, eq(coachingRelationships.memberId, members.id))
    .where(
      and(
        eq(coachingRelationships.trainerId, session.userId),
        eq(coachingRelationships.active, true),
      ),
    );

  const withProgrammes = await Promise.all(
    rows.map(async (m) => {
      const [prog] = await db
        .select({ id: programmes.id })
        .from(programmes)
        .where(and(eq(programmes.memberId, m.id), eq(programmes.status, "active")))
        .limit(1);
      return { id: m.id, name: m.name, programmeId: prog?.id ?? null };
    }),
  );

  return withProgrammes;
}

export async function getOrgCalendarEvents(session: SessionPayload): Promise<CalendarEvent[]> {
  const sessionRows = await db
    .select({
      id: sessions.id,
      scheduledAt: sessions.scheduledAt,
      status: sessions.status,
      memberId: sessions.memberId,
      memberName: members.name,
      programmeTitle: programmes.title,
      trainerName: users.name,
    })
    .from(sessions)
    .innerJoin(members, eq(sessions.memberId, members.id))
    .leftJoin(programmes, eq(sessions.programmeId, programmes.id))
    .leftJoin(users, eq(sessions.trainerId, users.id))
    .where(orgAndCentreScope(session, sessions.organisationId, sessions.centreId))
    .orderBy(sessions.scheduledAt);

  return sessionRows.map((row) => {
    const start = row.scheduledAt;
    const end = addMinutes(start, DEFAULT_SESSION_MINS);
    const programme = row.programmeTitle ?? "PT Session";
    return {
      id: row.id,
      type: "session" as const,
      title: row.memberName,
      subtitle: row.trainerName ? `${programme} · ${row.trainerName}` : programme,
      start: start.toISOString(),
      end: end.toISOString(),
      status: row.status,
      memberId: row.memberId,
      href: `/app/sessions/${row.id}`,
    };
  });
}

export async function getOrgCalendarClients(session: SessionPayload): Promise<CalendarClient[]> {
  const rows = await db
    .select({
      id: members.id,
      name: members.name,
    })
    .from(members)
    .where(orgAndCentreScope(session, members.organisationId, members.centreId))
    .orderBy(members.name);

  const withProgrammes = await Promise.all(
    rows.map(async (m) => {
      const [prog] = await db
        .select({ id: programmes.id })
        .from(programmes)
        .where(and(eq(programmes.memberId, m.id), eq(programmes.status, "active")))
        .limit(1);
      return { id: m.id, name: m.name, programmeId: prog?.id ?? null };
    }),
  );

  return withProgrammes;
}

