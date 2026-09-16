import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { progressSnapshots } from "@/db/schema";
import { assertMemberAccess } from "@/lib/access";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.PROGRESS_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const memberId = new URL(request.url).searchParams.get("memberId");
  if (!memberId) return apiError("memberId required", 400);

  try {
    await assertMemberAccess(session, memberId);
  } catch {
    return apiError("Not found", 404);
  }

  const snapshots = await db
    .select()
    .from(progressSnapshots)
    .where(eq(progressSnapshots.memberId, memberId))
    .orderBy(desc(progressSnapshots.recordedAt));

  return apiOk({ snapshots });
}

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.PROGRESS_EDIT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

    const body = z
    .object({
      memberId: z.string().uuid(),
      weight: z.number().optional(),
      bodyFat: z.number().optional(),
      measurements: z.record(z.string(), z.number()).optional(),
      performanceMetrics: z.record(z.string(), z.number()).optional(),
      photos: z.array(z.string()).max(6).optional(),
    })
    .parse(await request.json());

  try {
    await assertMemberAccess(session, body.memberId);
  } catch {
    return apiError("Not found", 404);
  }

  const [snapshot] = await db
    .insert(progressSnapshots)
    .values({
      organisationId: session.organisationId,
      memberId: body.memberId,
      trainerId: session.userId,
      weight: body.weight,
      bodyFat: body.bodyFat,
      measurements: body.measurements,
      performanceMetrics: body.performanceMetrics,
      photos: body.photos,
      recordedAt: new Date(),
    })
    .returning();

  await writeAudit(session, "progress.recorded", "progress_snapshot", snapshot.id);
  return apiOk({ snapshot });
}
