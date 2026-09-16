import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { coachMirrorAssessments } from "@/db/schema";
import { apiError, apiOk, centreIdForSession, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/permissions";

const createSchema = z.object({
  profileInput: z.record(z.string(), z.unknown()),
  profileScores: z.record(z.string(), z.number()),
  overall: z.number().min(0).max(100),
  headline: z.string(),
  weakDomain: z.string().optional(),
  pathway: z.array(z.tuple([z.string(), z.string()])).optional(),
  checklist: z.array(z.string()).optional(),
  incomeSnapshot: z.record(z.string(), z.string()).optional(),
});

export async function GET() {
  const { error, session } = await requireApiSession(PERMISSIONS.COACH_DEVELOPMENT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const rows = await db
    .select()
    .from(coachMirrorAssessments)
    .where(eq(coachMirrorAssessments.trainerId, session.userId))
    .orderBy(desc(coachMirrorAssessments.createdAt))
    .limit(12);

  return apiOk({ assessments: rows });
}

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.COACH_DEVELOPMENT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = createSchema.parse(await request.json());

  const [row] = await db
    .insert(coachMirrorAssessments)
    .values({
      organisationId: session.organisationId,
      centreId: centreIdForSession(session),
      trainerId: session.userId,
      profileInput: body.profileInput,
      profileScores: body.profileScores,
      overall: body.overall,
      headline: body.headline,
      weakDomain: body.weakDomain,
      pathway: body.pathway,
      checklist: body.checklist,
      incomeSnapshot: body.incomeSnapshot,
    })
    .returning();

  await writeAudit(session, "coach_mirror.completed", "coach_mirror", row.id);
  return apiOk({ assessment: row });
}
