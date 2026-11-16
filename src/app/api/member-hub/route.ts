import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  coachingRelationships,
  memberCoachQuestions,
  memberDailyLogs,
  memberVacations,
  memberWearables,
  messages,
} from "@/db/schema";
import { requireClientMember } from "@/lib/assert-client-member";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { createWorkRequest } from "@/lib/domain/work-request-service";
import { PERMISSIONS } from "@/lib/permissions";

const postSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("daily_log"),
    logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
    calories: z.number().int().min(0).max(15000).optional(),
    dailyReport: z.string().max(4000).optional(),
  }),
  z.object({
    type: z.literal("vacation"),
    startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
    endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
    notes: z.string().max(500).optional(),
  }),
  z.object({
    type: z.literal("wearable"),
    source: z.enum(["whoop", "oura", "ring", "manual"]).optional(),
    recovery: z.number().int().min(0).max(100).optional(),
    sleepHours: z.number().int().min(0).max(24).optional(),
    strain: z.number().int().min(0).max(100).optional(),
    hrv: z.number().int().min(0).max(300).optional(),
    steps: z.number().int().min(0).max(100000).optional(),
    notes: z.string().max(500).optional(),
  }),
  z.object({
    type: z.literal("question"),
    question: z.string().min(3).max(2000),
  }),
  z.object({
    type: z.literal("facility_ticket"),
    title: z.string().min(3).max(200),
    description: z.string().max(2000).optional(),
  }),
]);

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.SESSION_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);
  if (session.activeRole !== "client") return apiError("Members only", 403);

  let member;
  try {
    member = await requireClientMember(session);
  } catch {
    return apiError("No member profile linked", 404);
  }

  const body = postSchema.parse(await request.json());

  if (body.type === "daily_log") {
    const [row] = await db
      .insert(memberDailyLogs)
      .values({
        organisationId: session.organisationId,
        memberId: member.id,
        logDate: body.logDate,
        calories: body.calories,
        dailyReport: body.dailyReport,
      })
      .onConflictDoUpdate({
        target: [memberDailyLogs.memberId, memberDailyLogs.logDate],
        set: {
          calories: body.calories,
          dailyReport: body.dailyReport,
        },
      })
      .returning();
    return apiOk({ ok: true, dailyLog: row });
  }

  if (body.type === "vacation") {
    const [row] = await db
      .insert(memberVacations)
      .values({
        organisationId: session.organisationId,
        memberId: member.id,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        notes: body.notes,
      })
      .returning();
    return apiOk({ ok: true, vacation: row });
  }

  if (body.type === "wearable") {
    const [row] = await db
      .insert(memberWearables)
      .values({
        organisationId: session.organisationId,
        memberId: member.id,
        source: body.source ?? "manual",
        recovery: body.recovery,
        sleepHours: body.sleepHours,
        strain: body.strain,
        hrv: body.hrv,
        steps: body.steps,
        notes: body.notes,
      })
      .returning();
    return apiOk({ ok: true, wearable: row });
  }

  if (body.type === "question") {
    const [rel] = await db
      .select({ trainerId: coachingRelationships.trainerId })
      .from(coachingRelationships)
      .where(and(eq(coachingRelationships.memberId, member.id), eq(coachingRelationships.active, true)))
      .limit(1);

    const [row] = await db
      .insert(memberCoachQuestions)
      .values({
        organisationId: session.organisationId,
        memberId: member.id,
        trainerId: rel?.trainerId ?? null,
        question: body.question,
      })
      .returning();

    if (rel?.trainerId) {
      await db.insert(messages).values({
        organisationId: session.organisationId,
        memberId: member.id,
        trainerId: rel.trainerId,
        senderId: session.userId,
        body: `[Master coach question] ${body.question}`,
      });
    }

    await writeAudit(session, "member.question", "member_coach_question", row.id);
    return apiOk({ ok: true, question: row });
  }

  const title = `[Facility] ${body.title}`;
  const row = await createWorkRequest({
    centreId: member.centreId,
    title,
    description: body.description,
    priority: "normal",
    actor: session,
  });

  return apiOk({ ok: true, workRequest: row });
}