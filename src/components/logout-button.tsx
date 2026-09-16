"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      className="neu-control w-full px-3 py-2.5 text-sm font-semibold text-[var(--sidebar-muted)] transition hover:text-[var(--sidebar-text)]"
    >
      Log out
    </button>
  );
}
