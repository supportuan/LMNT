"use client";

import { useEffect, useRef, useState } from "react";

export function BranchSwitcher({
  branches,
  activeCentreId,
}: {
  branches: { id: string; name: string }[];
  activeCentreId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const current =
    activeCentreId == null
      ? "All branches"
      : (branches.find((branch) => branch.id === activeCentreId)?.name ?? "Branch");

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  async function select(centreId: string | null) {
    if (centreId === activeCentreId || (centreId == null && activeCentreId == null)) {
      setOpen(false);
      return;
    }
    setPending(true);
    const res = await fetch("/api/auth/switch-branch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ centreId }),
    });
    setPending(false);
    setOpen(false);
    if (!res.ok) return;
    window.location.assign("/app/analytics");
  }

  if (branches.length === 0) return null;

  return (
    <div ref={rootRef} className="relative mt-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
        className="neu-control flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--sidebar-muted)]">
            Workspace
          </span>
          <span className="mt-0.5 block truncate text-[13px] font-semibold text-[var(--sidebar-text)]">
            {pending ? "Switching…" : current}
          </span>
        </span>
        <span className="text-[10px] text-[var(--sidebar-muted)]" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-[12px] border border-[var(--workspace-border)] py-1"
          style={{
            background: "var(--workspace-elevated)",
            boxShadow: "var(--neu-shadow-raised)",
          }}
        >
          <SwitchOption
            label="All branches"
            selected={activeCentreId == null}
            onSelect={() => select(null)}
          />
          {branches.map((branch) => (
            <SwitchOption
              key={branch.id}
              label={branch.name}
              selected={activeCentreId === branch.id}
              onSelect={() => select(branch.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SwitchOption({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={`flex w-full px-3 py-2 text-left text-[13px] transition ${
        selected
          ? "bg-[var(--workspace-accent-muted)] font-semibold text-[var(--workspace-accent)]"
          : "text-[var(--sidebar-text)] hover:bg-[var(--workspace-surface)] hover:text-[var(--sidebar-text)]"
      }`}
    >
      {label}
    </button>
  );
}
