import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { centres } from "@/db/schema";
import { clearMetricCache } from "@/lib/metrics/cache";
import { createSessionToken, getSession, setSessionCookie } from "@/lib/session";

const switchSchema = z.object({
  centreId: z.string().uuid().nullable(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.activeRole !== "admin") {
    return NextResponse.json({ error: "Only admin can switch workspace branch" }, { status: 403 });
  }

  const body = switchSchema.parse(await request.json());
  const centreId = body.centreId;

  if (centreId) {
    const [centre] = await db
      .select({ id: centres.id, name: centres.name })
      .from(centres)
      .where(and(eq(centres.id, centreId), eq(centres.organisationId, session.organisationId)))
      .limit(1);
    if (!centre) {
      return NextResponse.json({ error: "Unknown branch" }, { status: 400 });
    }
    const token = await createSessionToken({
      ...session,
      activeCentreId: centreId,
      centreNames: { ...session.centreNames, [centre.id]: centre.name },
    });
    await setSessionCookie(token);
    clearMetricCache();
    revalidatePath("/app", "layout");
    return NextResponse.json({
      ok: true,
      activeCentreId: centreId,
      label: centre.name,
      redirectTo: "/app/analytics",
    });
  }

  const token = await createSessionToken({
    ...session,
    activeCentreId: null,
  });
  await setSessionCookie(token);
  clearMetricCache();
  revalidatePath("/app", "layout");
  return NextResponse.json({
    ok: true,
    activeCentreId: null,
    label: "All branches",
    redirectTo: "/app/analytics",
  });
}
