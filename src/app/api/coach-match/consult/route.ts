import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { coachMatchInteractions, leads, members } from "@/db/schema";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { publishEvent } from "@/lib/domain/publish-event";
import { PERMISSIONS } from "@/lib/permissions";

const bodySchema = z.object({
  trainerId: z.string().uuid(),
  centreId: z.string().uuid(),
  trainerName: z.string(),
  meetingType: z.enum(["consultation", "trial", "coffee"]).default("consultation"),
  notes: z.string().optional(),
  matchScore: z.number().int().min(0).max(100).optional(),
  matchReasons: z.array(z.string()).optional(),
});

const MEETING_COPY: Record<string, string> = {
  consultation: "free consultation",
  trial: "trial session",
  coffee: "intro coffee chat",
};

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.COACH_MATCH);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = bodySchema.parse(await request.json());

  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.userId, session.userId))
    .limit(1);

  if (!member) return apiError("Member profile required", 400);

  const meetingLabel = MEETING_COPY[body.meetingType] ?? "meeting";
  const defaultNotes = `Coach Match ${meetingLabel} request for ${body.trainerName}.`;

  const result = await db.transaction(async (tx) => {
    const [lead] = await tx
      .insert(leads)
      .values({
        organisationId: session.organisationId,
        centreId: body.centreId,
        ownerId: body.trainerId,
        name: member.name,
        email: member.email,
        phone: member.phone,
        source: "coach_match",
        stage: body.meetingType === "trial" ? "trial" : "consultation",
        notes: body.notes ?? defaultNotes,
        nextAction: `Schedule ${meetingLabel} with ${member.name}`,
      })
      .returning();

    const [existing] = await tx
      .select()
      .from(coachMatchInteractions)
      .where(
        and(
          eq(coachMatchInteractions.memberId, member.id),
          eq(coachMatchInteractions.trainerId, body.trainerId),
        ),
      )
      .limit(1);

    const interactionValues = {
      organisationId: session.organisationId,
      centreId: body.centreId,
      memberId: member.id,
      trainerId: body.trainerId,
      status: "requested" as const,
      meetingType: body.meetingType,
      matchScore: body.matchScore ?? null,
      matchReasons: body.matchReasons ?? [],
      notes: body.notes ?? defaultNotes,
      updatedAt: new Date(),
    };

    let interaction;
    if (existing) {
      [interaction] = await tx
        .update(coachMatchInteractions)
        .set(interactionValues)
        .where(eq(coachMatchInteractions.id, existing.id))
        .returning();
    } else {
      [interaction] = await tx.insert(coachMatchInteractions).values(interactionValues).returning();
    }

    await publishEvent(tx, {
      organisationId: session.organisationId,
      type: "MatchCreated",
      actorId: session.userId,
      entityType: "coach_match_interaction",
      entityId: interaction.id,
      payload: {
        memberId: member.id,
        trainerId: body.trainerId,
        centreId: body.centreId,
        meetingType: body.meetingType,
        matchScore: body.matchScore,
        leadId: lead.id,
      },
    });

    return { lead, interaction };
  });

  await writeAudit(session, "lead.created", "lead", result.lead.id, {
    source: "coach_match",
    meetingType: body.meetingType,
  });
  return apiOk(result);
}
