type Programme = {
  id: string;
  title: string;
  status: string;
  startsAt: Date | null;
  content: { markdown?: string; weeks?: unknown[] } | null;
};

export function ProgrammeList({ items }: { items: Programme[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">No programmes assigned yet.</p>;
  }

  const active = items.find((p) => p.status === "active") ?? items[0];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="text-xs uppercase tracking-wider text-zinc-500">Active programme</div>
        <div className="mt-1 text-xl font-bold">{active.title}</div>
        <div className="mt-1 text-sm capitalize text-zinc-400">
          {active.status}
          {active.startsAt ? ` · from ${new Date(active.startsAt).toLocaleDateString()}` : ""}
        </div>
        {active.content?.markdown ? (
          <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-zinc-800 bg-black/40 p-4 text-sm text-zinc-200">
            {active.content.markdown}
          </pre>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            Plan details will appear here once your coach publishes the programme.
          </p>
        )}
      </div>

      {items.length > 1 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            All programmes
          </h3>
          <ul className="space-y-2 text-sm">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex justify-between rounded-lg border border-zinc-800 px-4 py-2"
              >
                <span>{item.title}</span>
                <span className="capitalize text-zinc-500">{item.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
