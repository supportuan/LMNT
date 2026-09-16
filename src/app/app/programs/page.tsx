import Link from "next/link";
import { redirect } from "next/navigation";
import { DataTable, PageHeader } from "@/components/ui";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getTrainerPrograms } from "@/modules/trainer-queries";

export default async function ProgramsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "programs")) redirect(getRoleHome(session.activeRole));

  const programs = await getTrainerPrograms(session);

  return (
    <>
      <PageHeader
        title="Workouts"
        description="Create and publish training programs from a client’s Workout Plan tab."
        action={
          <Link
            href="/app/clients"
            className="rounded-md bg-[var(--workspace-accent)] px-4 py-2 text-sm font-semibold text-[var(--workspace-accent-text,#161e00)]"
          >
            Create Workout
          </Link>
        }
      />
      <DataTable
        headers={["Client", "Program", "Status", "Starts", "Action"]}
        rows={programs.map((p) => [
          p.memberName,
          p.title,
          p.status,
          p.startsAt ? new Date(p.startsAt).toLocaleDateString() : "—",
          <Link
            key={p.id}
            href={`/app/clients/${p.memberId}/program`}
            className="text-[var(--workspace-accent)]"
          >
            Open builder
          </Link>,
        ])}
      />
    </>
  );
}
