import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#0B0F0D] text-[#9AA39D]">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
