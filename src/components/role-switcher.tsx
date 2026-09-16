"use client";

import { useRouter } from "next/navigation";
import type { AppRole } from "@/lib/policy";
import { ROLE_LABELS } from "@/lib/policy";

export function RoleSwitcher({
  roles,
  activeRole,
}: {
  roles: AppRole[];
  activeRole: AppRole;
}) {
  const router = useRouter();

  if (roles.length <= 1) return null;

  async function switchRole(role: AppRole) {
    await fetch("/api/auth/switch-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--sidebar-muted)]">
        Switch role
      </div>
      <div className="flex flex-wrap gap-1.5">
        {roles.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => switchRole(role)}
            className={`rounded-[10px] px-2.5 py-1 text-[11px] font-medium transition ${
              role === activeRole
                ? "bg-[var(--workspace-accent)] text-[var(--workspace-accent-text)]"
                : "neu-control text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)]"
            }`}
          >
            {ROLE_LABELS[role]}
          </button>
        ))}
      </div>
    </div>
  );
}
