import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { coachNotes } from "@/db/schema";
import { assertMemberAccess } from "@/lib/access";
import { apiError, apiOk, centreIdForSession, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const { memberId } = await params;
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  if (session.activeRole === "client") {
    return apiError("Forbidden", 403);
  }

  try {
    await assertMemberAccess(session, memberId);
  } catch {
    return apiError("Not found", 404);
  }

  const notes = await db
    .select()
    .from(coachNotes)
    .where(eq(coachNotes.memberId, memberId))
    .orderBy(desc(coachNotes.updatedAt))
    .limit(20);

  return apiOk({ notes });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const { memberId } = await params;
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_EDIT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  if (session.activeRole === "client") {
    return apiError("Forbidden", 403);
  }

  const centreId = centreIdForSession(session);
  if (!centreId) return apiError("No centre assigned", 400);

  try {
    await assertMemberAccess(session, memberId);
  } catch {
    return apiError("Not found", 404);
  }

  const body = z.object({ body: z.string().min(1), id: z.string().uuid().optional() }).parse(
    await request.json(),
  );

  if (body.id) {
    await db
      .update(coachNotes)
      .set({ body: body.body, updatedAt: new Date() })
      .where(eq(coachNotes.id, body.id));
    await writeAudit(session, "note.updated", "coach_note", body.id);
    return apiOk({});
  }

  const [note] = await db
    .insert(coachNotes)
    .values({
      organisationId: session.organisationId,
      memberId,
      trainerId: session.userId,
      body: body.body,
    })
    .returning();

  await writeAudit(session, "note.created", "coach_note", note.id);
  return apiOk({ note });
}
