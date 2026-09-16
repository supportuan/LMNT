"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LoginVideoBackground } from "@/components/login-video-background";
import { ROLE_PORTAL_LABEL } from "@/lib/policy";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  return value;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const portalClient = searchParams.get("portal") === "client";
  const portalAdmin = searchParams.get("portal") === "admin";
  const nextPath = safeNextPath(searchParams.get("next"));

  const accent = portalClient ? "#ff5e07" : "#B7F34A";
  const accentText = portalClient ? "#370e00" : "#0B0F0D";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotStatus, setForgotStatus] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const heading = portalClient
    ? { title: "Welcome back", subtitle: "Workouts, progress, and your coach — in one place." }
    : portalAdmin
      ? { title: "Welcome back", subtitle: "Manage your gym. Keep everything on track." }
      : { title: "Welcome back", subtitle: "Manage workouts. Track progress." };
  const identifierLabel = portalAdmin || portalClient ? "Email" : "Email / Phone";
  const portalLabel = portalClient
    ? ROLE_PORTAL_LABEL.client
    : portalAdmin
      ? ROLE_PORTAL_LABEL.admin
      : ROLE_PORTAL_LABEL.trainer;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const portal = portalClient ? "client" : portalAdmin ? "admin" : undefined;
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password, ...(portal ? { portal } : {}) }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Login failed");
      setLoading(false);
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: "#0B0F0D", "--login-accent": accent } as React.CSSProperties}
    >
      <LoginVideoBackground />

      <div className="absolute left-0 top-0 z-20 px-6 py-5 md:px-8 md:py-6">
        {logoFailed ? (
          <div className="text-lg font-extrabold tracking-[0.18em]" style={{ color: accent }}>
            LMNT
          </div>
        ) : (
          <Image
            src="/logo.png"
            alt="LMNT Fitness Club"
            width={353}
            height={133}
            className="h-auto w-28 md:w-36"
            priority
            onError={() => setLogoFailed(true)}
          />
        )}
        <div className="mt-1.5 text-[12px] font-semibold tracking-tight text-[#9AA39D]">{portalLabel}</div>
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-24 md:px-10">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#F5F7F5]">{heading.title}</h1>
            <p className="mt-2 text-sm text-[#9AA39D]">{heading.subtitle}</p>
          </div>

          <form onSubmit={onSubmit} className="neu-card space-y-4 p-6">
            <div>
              <label htmlFor="identifier" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9AA39D]">
                {identifierLabel}
              </label>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={portalAdmin || portalClient ? "you@gym.com" : "you@gym.com or mobile number"}
                className="neu-input"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9AA39D]">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="neu-input"
                required
              />
            </div>

            {error && <p className="text-sm text-[#ef8b7a]">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-[12px] px-4 py-3 text-sm font-bold shadow-[var(--neu-shadow-control)] transition hover:opacity-95 disabled:opacity-50"
              style={{ background: accent, color: accentText }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>

            <button
              type="button"
              onClick={() => {
                setForgotOpen((v) => !v);
                setForgotStatus("");
                if (!forgotIdentifier && identifier.includes("@")) setForgotIdentifier(identifier);
              }}
              className="block w-full text-center text-sm text-[#9AA39D] underline-offset-4 hover:text-[#F5F7F5] hover:underline"
            >
              Forgot password
            </button>

            {forgotOpen && (
              <div className="neu-inset space-y-2 rounded-[12px] px-3 py-3">
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="Email or phone"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  className="neu-input"
                />
                <button
                  type="button"
                  disabled={forgotLoading || !forgotIdentifier.trim()}
                  onClick={async () => {
                    setForgotLoading(true);
                    setForgotStatus("");
                    const res = await fetch("/api/auth/forgot", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ identifier: forgotIdentifier }),
                    });
                    const data = await res.json().catch(() => ({}));
                    setForgotLoading(false);
                    setForgotStatus(
                      res.ok
                        ? (data.message ?? "If an account exists, we sent password reset instructions.")
                        : (data.error ?? "Could not send reset email"),
                    );
                  }}
                  className="w-full rounded-[12px] px-4 py-2 text-xs font-bold disabled:opacity-50"
                  style={{ background: accent, color: accentText }}
                >
                  {forgotLoading ? "Sending…" : "Send reset link"}
                </button>
                {forgotStatus && <p className="text-xs leading-relaxed text-[#9AA39D]">{forgotStatus}</p>}
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
