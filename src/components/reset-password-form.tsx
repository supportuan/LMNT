"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoginVideoBackground } from "@/components/login-video-background";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    const response = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Could not reset password");
      return;
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "#0B0F0D" }}>
      <LoginVideoBackground />
      <div className="absolute left-0 top-0 z-20 px-6 py-5 md:px-8 md:py-6">
        {logoFailed ? (
          <div className="text-lg font-extrabold tracking-[0.18em] text-[#B7F34A]">LMNT</div>
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
      </div>
      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-24 md:px-10">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#F5F7F5]">Set a new password</h1>
            <p className="mt-2 text-sm text-[#9AA39D]">Choose a password with at least 8 characters.</p>
          </div>
          {!token ? (
            <p className="neu-card p-6 text-sm text-[#ef8b7a]">This reset link is missing. Request a new one from the login page.</p>
          ) : (
            <form onSubmit={onSubmit} className="neu-card space-y-4 p-6">
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="neu-input"
              />
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="neu-input"
              />
              {error && <p className="text-sm text-[#ef8b7a]">{error}</p>}
              <button
                type="submit"
                disabled={loading || password.length < 8}
                className="w-full rounded-[12px] bg-[#B7F34A] px-4 py-3 text-sm font-bold text-[#0B0F0D] shadow-[var(--neu-shadow-control)] transition hover:opacity-95 disabled:opacity-50"
              >
                {loading ? "Saving…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
