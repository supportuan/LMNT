"use client";

type Client = { id: string; name: string; goal: string | null; email: string | null };

export function ClientCards({ clients }: { clients: Client[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {clients.map((c) => (
        <article
          key={c.id}
          className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-4"
        >
          <div className="text-lg font-semibold">{c.name}</div>
          <div className="mt-1 text-sm text-[var(--emerald-neon)]">{c.goal ?? "Goal not set"}</div>
          <div className="mt-3 text-xs text-[var(--workspace-subtle)]">{c.email ?? "No email"}</div>
        </article>
      ))}
    </div>
  );
}
