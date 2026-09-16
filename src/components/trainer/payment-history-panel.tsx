import { Panel } from "@/components/ui";

export function PaymentHistoryPanel({
  payments,
}: {
  payments: {
    id: string;
    amountInr: number;
    method: string;
    createdAt: Date;
    notes: string | null;
  }[];
}) {
  if (payments.length === 0) {
    return (
      <Panel title="Payment history">
        <p className="text-sm text-[var(--workspace-muted)]">No payments recorded yet.</p>
      </Panel>
    );
  }

  return (
    <Panel title="Payment history">
      <ul className="space-y-2 text-sm">
        {payments.map((p) => (
          <li key={p.id} className="flex justify-between border-b py-2">
            <div>
              <span className="font-medium">₹{p.amountInr.toLocaleString("en-IN")}</span>
              <span className="ml-2 capitalize text-[var(--workspace-muted)]">{p.method}</span>
              {p.notes && <span className="ml-2 text-[var(--workspace-muted)]">· {p.notes}</span>}
            </div>
            <span className="text-[var(--workspace-muted)]">
              {new Date(p.createdAt).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
