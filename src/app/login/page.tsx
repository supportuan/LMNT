import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[var(--jet-950)] text-[var(--workspace-muted)]">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
