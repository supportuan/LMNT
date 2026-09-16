import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, getSession, setSessionCookie } from "@/lib/session";

const switchSchema = z.object({
  role: z.enum(["admin", "centre_manager", "trainer", "client"]),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = switchSchema.parse(await request.json());

  if (!session.roles.includes(body.role)) {
    return NextResponse.json({ error: "Role not available" }, { status: 403 });
  }

  const token = await createSessionToken({
    ...session,
    activeRole: body.role,
  });

  await setSessionCookie(token);
  return NextResponse.json({ ok: true, activeRole: body.role });
}
