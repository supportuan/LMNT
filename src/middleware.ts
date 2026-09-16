import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { csrfAllowed } from "@/lib/csrf";
import { canAccessPath, redirectForUnauthorized } from "@/lib/route-guard";
import {
  SESSION_COOKIE,
  createSessionToken,
  shouldRefreshSession,
  verifySessionToken,
} from "@/lib/session-token";

const PUBLIC_PATHS = [
  "/login",
  "/reset-password",
  "/api/auth/login",
  "/api/auth/forgot",
  "/api/auth/reset",
  "/api/health",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/logo") ||
    pathname.startsWith("/api/auth/logout")
  ) {
    return NextResponse.next();
  }

  if (!csrfAllowed(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const verified = token ? await verifySessionToken(token) : null;
  const session = verified?.session ?? null;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/app") || pathname.startsWith("/settings")) {
    if (!canAccessPath(session.activeRole, pathname)) {
      return NextResponse.redirect(new URL(redirectForUnauthorized(session.activeRole, pathname), request.url));
    }
  }

  const response = NextResponse.next();
  if (verified && shouldRefreshSession(verified.expiresAt)) {
    const refreshed = await createSessionToken(session);
    response.cookies.set(SESSION_COOKIE, refreshed, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
