"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

type Message = {
  id: string;
  body: string;
  senderId: string;
  createdAt: Date | string;
};

type CheckIn = {
  id: string;
  sleep: string | null;
  energy: string | null;
  nutritionAdherence: string | null;
  trainingAdherence: string | null;
  painDiscomfort: string | null;
  clientComment: string | null;
  trainerResponse: string | null;
  createdAt: Date | string;
};

export function CommunicationPanel({
  memberId,
  trainerUserId,
  initialMessages,
  initialCheckIns,
  isTrainer,
}: {
  memberId: string;
  trainerUserId: string;
  initialMessages: Message[];
  initialCheckIns: CheckIn[];
  isTrainer: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [checkInId, setCheckInId] = useState<string | null>(
    initialCheckIns.find((c) => !c.trainerResponse)?.id ?? null,
  );
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!message.trim()) return;
    setLoading(true);
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, body: message }),
    });
    setMessage("");
    setLoading(false);
    router.refresh();
  }

  async function sendResponse() {
    if (!checkInId || !response.trim()) return;
    setLoading(true);
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, checkInId, trainerResponse: response }),
    });
    setResponse("");
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 font-semibold">Messages</h3>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {initialMessages.length === 0 ? (
            <p className="text-sm text-[var(--workspace-muted)]">No messages yet.</p>
          ) : (
            initialMessages.map((m) => (
              <div
                key={m.id}
                className={`rounded-md border px-4 py-3 text-sm ${
                  m.senderId === trainerUserId
                    ? "border-cyan-200 bg-cyan-50"
                    : "border-[var(--workspace-border)]"
                }`}
              >
                <p>{m.body}</p>
                <p className="mt-1 text-xs text-[var(--workspace-muted)]">
                  {new Date(m.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
        {isTrainer && (
          <div className="mt-3 flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a message..."
              className="flex-1 rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
            />
            <Button type="button" onClick={sendMessage} disabled={loading}>
              Send
            </Button>
          </div>
        )}
      </div>

      {initialCheckIns[0] && (
        <div>
          <h3 className="mb-3 font-semibold">Latest check-in</h3>
          <dl className="grid gap-2 sm:grid-cols-2 text-sm">
            {[
              ["Sleep", initialCheckIns[0].sleep],
              ["Energy", initialCheckIns[0].energy],
              ["Nutrition", initialCheckIns[0].nutritionAdherence],
              ["Training", initialCheckIns[0].trainingAdherence],
              ["Pain", initialCheckIns[0].painDiscomfort],
            ].map(([label, val]) => (
              <div key={String(label)}>
                <dt className="text-[var(--workspace-muted)]">{label}</dt>
                <dd className="font-medium">{val ?? "—"}</dd>
              </div>
            ))}
          </dl>
          {initialCheckIns[0].clientComment && (
            <p className="mt-2 text-sm italic">{initialCheckIns[0].clientComment}</p>
          )}
          {isTrainer && checkInId && (
            <div className="mt-3">
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={2}
                placeholder="Trainer response..."
                className="w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
              />
              <Button type="button" className="mt-2" onClick={sendResponse} disabled={loading}>
                Send response
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
