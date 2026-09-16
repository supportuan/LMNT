"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function AddStaffForm({
  centres,
  allowedRoles,
}: {
  centres: { id: string; name: string }[];
  allowedRoles: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(allowedRoles[0]?.value ?? "trainer");
  const [centreId, setCentreId] = useState(centres[0]?.id ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, role, centreId, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to add staff");
      return;
    }
    setOpen(false);
    setName("");
    setEmail("");
    setPassword("");
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Add staff
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-4">
      <h3 className="mb-3 font-semibold">Add staff member</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        />
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        >
          {allowedRoles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={centreId}
          onChange={(e) => setCentreId(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        >
          {centres.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          placeholder="Temporary password"
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="mt-2 text-sm text-[var(--status-danger)]">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button type="button" onClick={submit} disabled={loading || !name || !email || password.length < 8}>
          {loading ? "Saving…" : "Create"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      <p className="mt-2 text-xs text-[var(--workspace-muted)]">
        We will email them a sign-in link. Share this temporary password separately; they should change it after first login.
      </p>
    </div>
  );
}
