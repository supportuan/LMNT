"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Panel } from "@/components/ui";

const inputClass = "mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function postHub(body: Record<string, unknown>) {
  return fetch("/api/member-hub", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function MemberHubActions() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function run(key: string, body: Record<string, unknown>) {
    setLoading(key);
    setMessage("");
    const res = await postHub(body);
    setLoading(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "Could not save");
      return;
    }
    setMessage("Saved");
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Daily log — calories & report">
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void run("daily", {
              type: "daily_log",
              logDate: fd.get("logDate"),
              calories: fd.get("calories") ? Number(fd.get("calories")) : undefined,
              dailyReport: String(fd.get("dailyReport") || ""),
            });
          }}
        >
          <label className="block text-sm">
            Date
            <input name="logDate" type="date" defaultValue={todayIso()} required className={inputClass} />
          </label>
          <label className="block text-sm">
            Calories
            <input name="calories" type="number" min={0} placeholder="kcal" className={inputClass} />
          </label>
          <label className="block text-sm">
            Daily report
            <textarea name="dailyReport" rows={2} placeholder="Energy, mood, wins…" className={inputClass} />
          </label>
          <Button type="submit" size="sm" disabled={loading === "daily"}>
            {loading === "daily" ? "Saving…" : "Save daily log"}
          </Button>
        </form>
      </Panel>

      <Panel title="Whoop / ring metrics">
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void run("wearable", {
              type: "wearable",
              source: fd.get("source"),
              recovery: fd.get("recovery") ? Number(fd.get("recovery")) : undefined,
              sleepHours: fd.get("sleepHours") ? Number(fd.get("sleepHours")) : undefined,
              strain: fd.get("strain") ? Number(fd.get("strain")) : undefined,
              hrv: fd.get("hrv") ? Number(fd.get("hrv")) : undefined,
              steps: fd.get("steps") ? Number(fd.get("steps")) : undefined,
            });
          }}
        >
          <label className="block text-sm">
            Source
            <select name="source" className={inputClass} defaultValue="whoop">
              <option value="whoop">Whoop</option>
              <option value="oura">Oura</option>
              <option value="ring">Smart ring</option>
              <option value="manual">Manual</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">
              Recovery %
              <input name="recovery" type="number" min={0} max={100} className={inputClass} />
            </label>
            <label className="text-sm">
              Sleep (h)
              <input name="sleepHours" type="number" min={0} max={24} className={inputClass} />
            </label>
            <label className="text-sm">
              Strain
              <input name="strain" type="number" min={0} max={21} className={inputClass} />
            </label>
            <label className="text-sm">
              HRV
              <input name="hrv" type="number" min={0} className={inputClass} />
            </label>
          </div>
          <Button type="submit" size="sm" disabled={loading === "wearable"}>
            Log metrics
          </Button>
        </form>
      </Panel>

      <Panel title="Plan vacation">
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void run("vacation", {
              type: "vacation",
              startsAt: fd.get("startsAt"),
              endsAt: fd.get("endsAt"),
              notes: String(fd.get("notes") || ""),
            });
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">
              From
              <input name="startsAt" type="date" required className={inputClass} />
            </label>
            <label className="text-sm">
              To
              <input name="endsAt" type="date" required className={inputClass} />
            </label>
          </div>
          <textarea name="notes" rows={2} placeholder="Travel, deload, etc." className={inputClass} />
          <Button type="submit" size="sm" disabled={loading === "vacation"}>
            Add vacation
          </Button>
        </form>
      </Panel>

      <Panel title="Facility ticket">
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void run("facility", {
              type: "facility_ticket",
              title: fd.get("title"),
              description: fd.get("description"),
            });
          }}
        >
          <input name="title" required placeholder="Issue (e.g. AC in studio)" className={inputClass} />
          <textarea name="description" rows={2} placeholder="Details" className={inputClass} />
          <Button type="submit" size="sm" disabled={loading === "facility"}>
            Raise ticket
          </Button>
        </form>
      </Panel>

      <div className="lg:col-span-2">
        <Panel title="Ask master coach">
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void run("question", { type: "question", question: fd.get("question") });
              e.currentTarget.reset();
            }}
          >
            <textarea
              name="question"
              required
              rows={3}
              placeholder="Training, nutrition, recovery…"
              className={inputClass}
            />
            <Button type="submit" size="sm" disabled={loading === "question"}>
              Send question
            </Button>
          </form>
        </Panel>
      </div>

      {message && <p className="text-sm text-[var(--workspace-muted)] lg:col-span-2">{message}</p>}
    </div>
  );
}