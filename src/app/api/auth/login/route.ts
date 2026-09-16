import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateUser, buildSessionForRole, roleForPortal } from "@/lib/auth";
import { clearRateLimit, isRateLimited, recordRateLimitHit } from "@/lib/auth-rate-limit";
import { setSessionCookie } from "@/lib/session";

const loginSchema = z.object({
  identifier: z.string().min(1).optional(),
  email: z.string().optional(),
  password: z.string().min(1),
  portal: z.enum(["admin", "trainer", "client"]).optional(),
});

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function rateKey(identifier: string) {
  return `login:${identifier.trim().toLowerCase()}`;
}

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const identifier = (body.identifier ?? body.email ?? "").trim();
    if (!identifier) {
      return NextResponse.json({ error: "Email or phone is required" }, { status: 400 });
    }

    const key = rateKey(identifier);
    if (await isRateLimited(key, MAX_ATTEMPTS)) {
      return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
    }

    const auth = await authenticateUser(identifier, body.password);

    if (!auth) {
      await recordRateLimitHit(key, WINDOW_MS);
      return NextResponse.json({ error: "Invalid email, phone, or password" }, { status: 401 });
    }

    const activeRole = roleForPortal(auth.roles, body.portal);
    if (!activeRole) {
      return NextResponse.json({ error: "This account cannot sign in here" }, { status: 403 });
    }

    await clearRateLimit(key);
    const token = await buildSessionForRole(auth, activeRole);

    if (!token) {
      return NextResponse.json({ error: "No role assigned to this user" }, { status: 403 });
    }

    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      user: {
        name: auth.user.name,
        email: auth.user.email,
        activeRole,
        roles: auth.roles,
        organisationName: auth.organisationName,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
