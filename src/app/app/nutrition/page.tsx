import { redirect } from "next/navigation";
import { PageHeader, Panel } from "@/components/ui";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getClientJourney } from "@/modules/queries";
import { getMemberNutrition } from "@/modules/trainer-queries";

export default async function ClientNutritionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "nutrition")) redirect(getRoleHome(session.activeRole));

  const journey = await getClientJourney(session);
  const memberId = journey?.member.id;
  const plan = memberId ? await getMemberNutrition(memberId) : null;

  return (
    <>
      <PageHeader title="Nutrition" description="Your nutrition targets from your coach." />
      <Panel title="Daily targets">
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-[var(--workspace-muted)]">Calories</dt>
            <dd className="text-xl font-semibold">{plan?.calories ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[var(--workspace-muted)]">Protein</dt>
            <dd className="text-xl font-semibold">{plan?.protein ? `${plan.protein}g` : "—"}</dd>
          </div>
          <div>
            <dt className="text-[var(--workspace-muted)]">Carbohydrates</dt>
            <dd className="text-xl font-semibold">{plan?.carbs ? `${plan.carbs}g` : "—"}</dd>
          </div>
          <div>
            <dt className="text-[var(--workspace-muted)]">Fat</dt>
            <dd className="text-xl font-semibold">{plan?.fat ? `${plan.fat}g` : "—"}</dd>
          </div>
          {plan?.dietPreference && (
            <div>
              <dt className="text-[var(--workspace-muted)]">Diet preference</dt>
              <dd className="text-xl font-semibold">{plan.dietPreference}</dd>
            </div>
          )}
          {plan?.mealStructure && (
            <div className="sm:col-span-2">
              <dt className="text-[var(--workspace-muted)]">Meal structure</dt>
              <dd className="mt-1">{plan.mealStructure}</dd>
            </div>
          )}
          {plan?.mealTiming && (
            <div className="sm:col-span-2">
              <dt className="text-[var(--workspace-muted)]">Meal timing</dt>
              <dd className="mt-1">{plan.mealTiming}</dd>
            </div>
          )}
          {plan?.notes && (
            <div className="sm:col-span-2">
              <dt className="text-[var(--workspace-muted)]">Coach notes</dt>
              <dd className="mt-1">{plan.notes}</dd>
            </div>
          )}
        </dl>
      </Panel>
    </>
  );
}
