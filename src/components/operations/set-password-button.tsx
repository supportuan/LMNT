"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function SetPasswordButton({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSaved(false);
    const res = await fetch("/api/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not set password");
      return;
    }
    setPassword("");
    setSaved(true);
    setOpen(false);
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        {saved ? "Password set" : "Set password"}
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <input
        type="password"
        required
        minLength={8}
        placeholder={`New password for ${userName}`}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="neu-input w-40 py-1 text-xs"
      />
      <Button type="submit" size="sm" disabled={loading || password.length < 8}>
        {loading ? "Saving…" : "Save"}
      </Button>
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
