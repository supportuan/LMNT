import { redirect } from "next/navigation";
import { Badge, PageHeader } from "@/components/ui";
import { canAccessModule } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getOnboardingAssignments } from "@/modules/queries";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "onboarding")) redirect("/login");

  const assignments = await getOnboardingAssignments(session);

  return (
    <>
      <PageHeader
        title="Onboarding assignments"
        description="New member onboarding checklists assigned to you."
      />
      <div className="space-y-4">
        {assignments.length === 0 ? (
          <p className="text-sm text-zinc-500">No onboarding assignments.</p>
        ) : (
          assignments.map((item) => (
            <div key={item.id} className="rounded-xl border border-zinc-800 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{item.memberName}</div>
                  <div className="text-sm text-zinc-400">{item.memberGoal ?? "No goal set"}</div>
                </div>
                <Badge tone={item.status === "completed" ? "success" : "info"}>{item.status}</Badge>
              </div>
              <ul className="space-y-1 text-sm">
                {item.checklist.map((step, i) => (
                  <li key={i} className={step.done ? "text-zinc-500 line-through" : "text-zinc-300"}>
                    {step.done ? "✓" : "○"} {step.item}
                  </li>
                ))}
              </ul>
              {item.dueAt && (
                <p className="mt-2 text-xs text-zinc-500">
                  Due {new Date(item.dueAt).toLocaleDateString()}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
