import Link from "next/link";

function DeltaBadge({ delta, label }: { delta: number; label?: string }) {
  const up = delta >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium ${
        up ? "bg-[var(--status-success-bg)] text-[var(--status-success)]" : "bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
      }`}
    >
      {up ? "↑" : "↓"} {Math.abs(delta)}%
      {label && <span className="font-normal text-[var(--workspace-muted)]">{label}</span>}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-[var(--workspace-text)]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--workspace-muted)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  delta,
  deltaLabel = "vs last period",
  icon,
  accent,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  delta?: number;
  deltaLabel?: string;
  icon?: React.ReactNode;
  accent?: boolean;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--workspace-muted)]">
          {label}
        </div>
        {icon && (
          <div className="neu-control flex h-9 w-9 shrink-0 items-center justify-center text-[var(--workspace-accent)]">
            {icon}
          </div>
        )}
      </div>
      <div
        className={`mt-4 text-[34px] font-bold leading-none tracking-tight tabular-nums ${
          accent ? "text-[var(--workspace-accent)]" : "text-[var(--workspace-text)]"
        }`}
      >
        {value}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {delta !== undefined && <DeltaBadge delta={delta} label={deltaLabel} />}
        {hint && <span className="text-[11px] text-[var(--workspace-muted)]">{hint}</span>}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="neu-card block p-[var(--card-padding)] transition hover:bg-[var(--workspace-elevated)]"
      >
        {content}
      </Link>
    );
  }

  return <div className="neu-card p-[var(--card-padding)]">{content}</div>;
}

export function Panel({
  title,
  children,
  action,
  elevated,
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  elevated?: boolean;
}) {
  return (
    <section className={`neu-card p-[var(--card-padding)] ${elevated ? "" : ""}`}>
      {(title || action) && (
        <div className="mb-5 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-semibold tracking-tight text-[var(--workspace-text)]">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number | React.ReactNode)[][];
}) {
  return (
    <div className="neu-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-[13px]">
          <thead className="text-left text-[var(--workspace-muted)]">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.12em]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-5 py-12">
                  <EmptyState title="No records found" description="Nothing to show in this view yet." />
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={index}
                  className="border-t border-[var(--workspace-border)] transition-colors hover:bg-[var(--workspace-elevated)]"
                >
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-5 py-3.5 align-middle text-[var(--workspace-text)]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "info" | "danger";
}) {
  const tones = {
    neutral: "bg-[var(--workspace-elevated)] text-[var(--workspace-muted)]",
    success: "bg-[var(--status-success-bg)] text-[var(--status-success)]",
    warning: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
    info: "bg-[var(--workspace-accent-muted)] text-[var(--workspace-accent)]",
    danger: "bg-[var(--status-danger-bg)] text-[var(--status-danger)]",
  };

  return (
    <span className={`inline-flex rounded-lg px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Button({
  children,
  href,
  variant = "primary",
  size = "md",
  className = "",
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center justify-center font-semibold transition duration-150 disabled:cursor-not-allowed disabled:opacity-50";
  const sizes = { sm: "rounded-[12px] px-3 py-1.5 text-xs", md: "rounded-[12px] px-4 py-2.5 text-sm" };
  const variants = {
    primary:
      "bg-[var(--workspace-accent)] text-[var(--workspace-accent-text)] shadow-[var(--neu-shadow-control)] hover:bg-[var(--workspace-accent-hover)]",
    secondary:
      "neu-control text-[var(--workspace-text)] hover:text-[var(--workspace-text)]",
    ghost: "rounded-[12px] text-[var(--workspace-muted)] hover:text-[var(--workspace-text)] hover:bg-[var(--workspace-elevated)]",
  };
  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function AttentionItem({
  title,
  detail,
  tone = "warning",
}: {
  title: string;
  detail: string;
  tone?: "warning" | "danger" | "info";
}) {
  const border = {
    warning: "border-l-[var(--status-warning)]",
    danger: "border-l-[var(--status-danger)]",
    info: "border-l-[var(--workspace-accent)]",
  };
  return (
    <div className={`neu-inset rounded-[12px] border-l-[3px] px-4 py-3 ${border[tone]}`}>
      <div className="text-sm font-medium text-[var(--workspace-text)]">{title}</div>
      <div className="mt-0.5 text-[11px] text-[var(--workspace-muted)]">{detail}</div>
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`relative block ${className}`}>
      <span className="sr-only">{placeholder}</span>
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--workspace-muted)]"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
        <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="neu-input pl-10"
      />
    </label>
  );
}

export function SelectInput({
  value,
  onChange,
  children,
  className = "",
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`neu-input cursor-pointer appearance-none ${className}`}
    >
      {children}
    </select>
  );
}

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="neu-inset flex flex-wrap gap-1 rounded-[14px] p-1.5" role="tablist">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`rounded-[10px] px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-[var(--workspace-accent)] text-[var(--workspace-accent-text)]"
                : "text-[var(--workspace-muted)] hover:text-[var(--workspace-text)]"
            }`}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={`ml-1.5 tabular-nums ${active ? "opacity-80" : "opacity-70"}`}>{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Pagination({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 pt-4">
      <p className="text-xs text-[var(--workspace-muted)]">
        Page {page} of {pageCount}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="neu-inset mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] text-[var(--workspace-muted)]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.75" />
          <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-sm font-medium text-[var(--workspace-text)]">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-[var(--workspace-muted)]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="neu-card w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2 id="modal-title" className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="neu-control h-8 w-8 text-[var(--workspace-muted)] hover:text-[var(--workspace-text)]"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const fieldClass = "neu-input";
