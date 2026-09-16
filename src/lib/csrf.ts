import type { NextRequest } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function allowedOrigins(request: NextRequest) {
  const origins = new Set<string>([request.nextUrl.origin]);
  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) {
    try {
      origins.add(new URL(appUrl).origin);
    } catch {
      // ignore invalid APP_URL
    }
  }
  return origins;
}

export function csrfAllowed(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return true;
  if (!request.nextUrl.pathname.startsWith("/api")) return true;

  const allowed = allowedOrigins(request);
  const origin = request.headers.get("origin");
  if (origin && allowed.has(origin)) return true;

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      if (allowed.has(new URL(referer).origin)) return true;
    } catch {
      return false;
    }
  }

  return false;
}
