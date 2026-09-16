"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Panel } from "@/components/ui";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "completed" | "cancelled";
  dueAt: string | null;
  triggerEvent: string | null;
  createdAt: string;
};

const STATUS_TONE: Record<TaskRow["status"], "info" | "warning" | "success" | "neutral"> = {
  open: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "neutral",
};

export function TasksQueue({ initialTasks }: { initialTasks: TaskRow[] }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function patchTask(id: string, status: TaskRow["status"]) {
    setLoadingId(id);
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoadingId(null);
    if (!res.ok) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t)).filter((t) => t.status !== "completed" && t.status !== "cancelled"),
    );
    router.refresh();
  }

  const open = tasks.filter((t) => t.status === "open" || t.status === "in_progress");

  return (
    <Panel title={`Open tasks (${open.length})`}>
      {open.length === 0 ? (
        <p className="text-sm text-[var(--workspace-muted)]">
          No open tasks. Escalations from sessions and follow-ups will appear here.
        </p>
      ) : (
        <div className="space-y-3">
          {open.map((task) => {
            const overdue = task.dueAt && new Date(task.dueAt) < new Date();
            return (
              <div
                key={task.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[var(--workspace-border)] p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{task.title}</span>
                    <Badge tone={STATUS_TONE[task.status]}>{task.status.replace("_", " ")}</Badge>
                    {overdue ? <Badge tone="danger">Overdue</Badge> : null}
                  </div>
                  {task.description ? (
                    <p className="mt-1 text-sm text-[var(--workspace-muted)]">{task.description}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--workspace-muted)]">
                    {task.dueAt ? (
                      <span>Due {new Date(task.dueAt).toLocaleString()}</span>
                    ) : null}
                    {task.triggerEvent ? <span>From {task.triggerEvent}</span> : null}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {task.status === "open" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={loadingId === task.id}
                      onClick={() => patchTask(task.id, "in_progress")}
                    >
                      Start
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    disabled={loadingId === task.id}
                    onClick={() => patchTask(task.id, "completed")}
                  >
                    Done
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
