import { redirect } from "next/navigation";
import { TasksQueue } from "@/components/trainer/tasks-queue";
import { PageHeader } from "@/components/ui";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getTrainerOpenTasks } from "@/modules/trainer-queries";

export default async function TasksPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "tasks")) redirect(getRoleHome(session.activeRole));

  const tasks = await getTrainerOpenTasks(session);

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Follow-ups, escalations, and action items from sessions and automation."
      />
      <TasksQueue initialTasks={tasks} />
    </>
  );
}
