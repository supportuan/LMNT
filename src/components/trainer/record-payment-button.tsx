"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog, Field } from "@/components/dialog";
import { Button } from "@/components/ui";
import { sendJson } from "@/lib/send-json";

const METHODS = [
  { value: "upi", label: "UPI" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "other", label: "Other" },
] as const;

export function RecordPaymentButton({
  planId,
  amountDue,
  memberName,
}: {
  planId: string;
  amountDue: number;
  memberName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(amountDue));
  const [method, setMethod] = useState<(typeof METHODS)[number]["value"]>("upi");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function record(e: React.FormEvent) {
    e.preventDefault();
    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) return setError("Enter an amount above zero.");
    if (paymentAmount > amountDue) return setError(`Amount can't exceed ₹${amountDue.toLocaleString("en-IN")} due.`);
    setSaving(true);
    setError(null);
    const res = await sendJson("/api/payment-records", "POST", {
      planId,
      paymentAmount,
      method,
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Record payment
      </Button>
      {open && (
        <Dialog
          title="Record payment"
          description={`${memberName} · ₹${amountDue.toLocaleString("en-IN")} due`}
          size="sm"
          onClose={() => setOpen(false)}
        >
          <form onSubmit={record} className="space-y-4">
            <Field label="Amount (₹)" error={error ?? undefined}>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={amountDue}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="neu-input"
                required
              />
            </Field>
            <Field label="Method">
              <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className="neu-input">
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Note" hint="Optional — reference number, etc.">
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className="neu-input" />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Record payment"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
