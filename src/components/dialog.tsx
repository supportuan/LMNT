"use client";

import { useEffect, useId, useRef } from "react";

export function Dialog({
  title,
  description,
  children,
  onClose,
  size = "md",
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg";
  footer?: React.ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(
      "input:not([type=hidden]):not([disabled]), select, textarea, button[data-autofocus]",
    );
    (first ?? panel)?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const focusable = [
        ...panel.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
        ),
      ];
      if (focusable.length === 0) return;
      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  const width = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-2xl" : "max-w-lg";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`neu-card flex max-h-[92dvh] w-full ${width} flex-col rounded-b-none outline-none sm:rounded-b-[var(--radius-card)]`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--workspace-border)] px-6 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold tracking-tight">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-xs text-[var(--workspace-muted)]">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="neu-control flex h-9 w-9 shrink-0 items-center justify-center text-lg text-[var(--workspace-muted)] hover:text-[var(--workspace-text)]"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--workspace-border)] px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-muted)]">
        {label}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-[11px] text-[var(--workspace-subtle)]">{hint}</span>}
      {error && <span className="mt-1 block text-[11px] text-[var(--status-danger)]">{error}</span>}
    </label>
  );
}

export function DayPicker({
  value,
  onChange,
  label = "Days",
}: {
  value: number[];
  onChange: (next: number[]) => void;
  label?: string;
}) {
  const days = [
    [1, "Mon"],
    [2, "Tue"],
    [3, "Wed"],
    [4, "Thu"],
    [5, "Fri"],
    [6, "Sat"],
    [0, "Sun"],
  ] as const;
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {days.map(([dow, short]) => {
        const on = value.includes(dow);
        return (
          <button
            key={dow}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((d) => d !== dow) : [...value, dow])}
            className={`min-h-9 min-w-12 rounded-[10px] px-3 text-xs font-semibold transition ${
              on
                ? "bg-[var(--emerald-neon)] text-[var(--emerald-neon-ink)]"
                : "bg-[var(--moss-tint)] text-[var(--workspace-muted)] ring-1 ring-inset ring-[var(--moss-800)] hover:text-[var(--workspace-text)]"
            }`}
          >
            {short}
          </button>
        );
      })}
    </div>
  );
}
