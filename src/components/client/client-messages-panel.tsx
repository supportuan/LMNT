"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, PageHeader, Panel } from "@/components/ui";

type Message = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
};

export function ClientMessagesPanel({
  userId,
  initialMessages,
}: {
  userId: string;
  initialMessages: Message[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"messages" | "checkin">("messages");
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkIn, setCheckIn] = useState({
    sleep: "",
    energy: "",
    nutritionAdherence: "",
    trainingAdherence: "",
    painDiscomfort: "",
    clientComment: "",
  });

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  async function reportMessage(messageId: string) {
    const reason = window.prompt("Why are you reporting this message?");
    if (!reason?.trim()) return;
    setLoading(true);
    await fetch("/api/message-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, reason: reason.trim() }),
    });
    setLoading(false);
    alert("Report submitted. Our team will review it.");
  }

  async function sendMessage() {
    if (!body.trim()) return;
    setLoading(true);
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setBody("");
    setLoading(false);
    router.refresh();
    const res = await fetch("/api/messages");
    const data = await res.json();
    setMessages(data.messages ?? []);
  }

  async function submitCheckIn() {
    setLoading(true);
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkIn }),
    });
    setLoading(false);
    setCheckIn({
      sleep: "",
      energy: "",
      nutritionAdherence: "",
      trainingAdherence: "",
      painDiscomfort: "",
      clientComment: "",
    });
    alert("Check-in sent to your coach.");
  }

  return (
    <>
      <PageHeader title="Messages" description="Updates and check-ins with your coach." />
      <div className="mb-4 flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={tab === "messages" ? "primary" : "secondary"}
          onClick={() => setTab("messages")}
        >
          Messages
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === "checkin" ? "primary" : "secondary"}
          onClick={() => setTab("checkin")}
        >
          Weekly check-in
        </Button>
      </div>

      {tab === "messages" ? (
        <Panel title="Inbox">
          {messages.length === 0 ? (
            <p className="text-sm text-[var(--workspace-muted)]">No messages yet.</p>
          ) : (
            <div className="space-y-2">
              {messages.map((m) => {
                const fromCoach = m.senderId !== userId;
                return (
                  <div
                    key={m.id}
                    className={`rounded-md border px-4 py-3 text-sm ${
                      fromCoach ? "border-[var(--workspace-accent)]/30 bg-[var(--workspace-elevated)]" : ""
                    }`}
                  >
                    <div className="mb-1 flex justify-between text-xs text-[var(--workspace-muted)]">
                      <span>{fromCoach ? "Coach" : "You"}</span>
                      <span>{new Date(m.createdAt).toLocaleString()}</span>
                    </div>
                    <div>{m.body}</div>
                    {fromCoach && (
                      <button
                        type="button"
                        className="mt-2 text-[11px] font-medium text-[var(--workspace-muted)] underline"
                        onClick={() => reportMessage(m.id)}
                      >
                        Report message
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Message your coach..."
              className="flex-1 rounded-md border px-3 py-2 text-sm"
            />
            <Button type="button" onClick={sendMessage} disabled={loading}>
              Send
            </Button>
          </div>
        </Panel>
      ) : (
        <Panel title="Weekly check-in">
          <p className="mb-4 text-sm text-[var(--workspace-muted)]">
            Share how your week went — your coach reviews these before adjusting your plan.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["sleep", "Sleep quality"],
                ["energy", "Energy levels"],
                ["nutritionAdherence", "Nutrition adherence"],
                ["trainingAdherence", "Training adherence"],
                ["painDiscomfort", "Pain or discomfort"],
                ["clientComment", "Anything else"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-sm">
                <span className="text-[var(--workspace-muted)]">{label}</span>
                <input
                  value={checkIn[key]}
                  onChange={(e) => setCheckIn({ ...checkIn, [key]: e.target.value })}
                  className="mt-1 w-full rounded-md border px-3 py-2"
                />
              </label>
            ))}
          </div>
          <Button type="button" className="mt-4" onClick={submitCheckIn} disabled={loading}>
            Submit check-in
          </Button>
        </Panel>
      )}
    </>
  );
}
