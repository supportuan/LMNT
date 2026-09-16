import { redirect } from "next/navigation";
import { Panel } from "@/components/ui";
import { NutritionEditor } from "@/components/trainer/nutrition-editor";
import { assertMemberAccess } from "@/lib/access";
import { getSession } from "@/lib/session";
import { getMemberNutrition } from "@/modules/trainer-queries";

export default async function ClientNutritionTab({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  await assertMemberAccess(session, memberId);

  const plan = await getMemberNutrition(memberId);
  const readOnly = session.activeRole === "client";

  return (
    <Panel title="Nutrition">
      <NutritionEditor memberId={memberId} initialPlan={plan} readOnly={readOnly} />
    </Panel>
  );
}
