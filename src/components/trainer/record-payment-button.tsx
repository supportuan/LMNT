"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

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
  const [amount, setAmount] = useState(String(amountDue));
  const [loading, setLoading] = useState(false);

  async function record() {
    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) return;
    setLoading(true);
    await fetch("/api/payment-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, paymentAmount, method: "upi" }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        max={amountDue}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-24 rounded border px-2 py-1 text-sm"
        title={`Record payment for ${memberName}`}
      />
      <Button type="button" size="sm" variant="secondary" onClick={record} disabled={loading}>
        Record
      </Button>
    </div>
  );
}
