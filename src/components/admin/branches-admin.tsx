"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, DataTable, Panel } from "@/components/ui";

export function BranchesAdmin({
  centres,
}: {
  centres: {
    id: string;
    name: string;
    slug: string;
    capacity: number;
    timezone: string;
    status: string;
  }[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("250");
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function addBranch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/centres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        capacity: Number(capacity) || 250,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to add branch");
      return;
    }
    setName("");
    setCapacity("250");
    router.refresh();
  }

  async function toggleStatus(centre: { id: string; status: string }) {
    setToggling(centre.id);
    await fetch("/api/centres", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: centre.id,
        status: centre.status === "active" ? "inactive" : "active",
      }),
    });
    setToggling(null);
    router.refresh();
  }

  return (
    <Panel
      title="Branches"
      action={<span className="text-xs text-[var(--workspace-muted)]">{centres.filter((c) => c.status === "active").length} active</span>}
    >
      <p className="mb-4 text-sm text-[var(--workspace-muted)]">
        Add a branch to show it in the workspace switcher, Assign plan, and Add member.
      </p>
      <DataTable
        headers={["Name", "Slug", "Capacity", "Timezone", "Status", ""]}
        rows={centres.map((centre) => [
          centre.name,
          centre.slug,
          centre.capacity,
          centre.timezone,
          <Badge key={`${centre.id}-status`} tone={centre.status === "active" ? "success" : "neutral"}>
            {centre.status}
          </Badge>,
          <Button
            key={`${centre.id}-toggle`}
            type="button"
            size="sm"
            variant="secondary"
            disabled={toggling === centre.id}
            onClick={() => void toggleStatus(centre)}
          >
            {centre.status === "active" ? "Disable" : "Enable"}
          </Button>,
        ])}
      />
      <form onSubmit={addBranch} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          required
          placeholder="Branch name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="neu-input"
        />
        <input
          type="number"
          min={1}
          placeholder="Capacity"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          className="neu-input"
        />
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Saving…" : "Add branch"}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Panel>
  );
}
