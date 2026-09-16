"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

type Plan = {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  dietPreference: string | null;
  mealStructure: string | null;
  mealTiming: string | null;
  notes: string | null;
};

export function NutritionEditor({
  memberId,
  initialPlan,
  readOnly = false,
}: {
  memberId: string;
  initialPlan: Plan | null;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan>(
    initialPlan ?? {
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
      dietPreference: null,
      mealStructure: null,
      mealTiming: null,
      notes: null,
    },
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/members/${memberId}/nutrition`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    });
    setSaving(false);
    router.refresh();
  }

  const fields: { key: keyof Plan; label: string; type?: string }[] = [
    { key: "calories", label: "Calories", type: "number" },
    { key: "protein", label: "Protein (g)", type: "number" },
    { key: "carbs", label: "Carbohydrates (g)", type: "number" },
    { key: "fat", label: "Fat (g)", type: "number" },
    { key: "dietPreference", label: "Diet preference" },
    { key: "mealStructure", label: "Meal structure" },
    { key: "mealTiming", label: "Meal timing" },
  ];

  return (
    <div>
      <dl className="grid gap-3 sm:grid-cols-2 text-sm">
        {fields.map(({ key, label, type }) => (
          <div key={key}>
            <dt className="text-[var(--workspace-muted)]">{label}</dt>
            <dd className="mt-1">
              {readOnly ? (
                <span className="font-medium">{plan[key] ?? "—"}</span>
              ) : (
                <input
                  type={type ?? "text"}
                  value={plan[key] ?? ""}
                  onChange={(e) =>
                    setPlan({
                      ...plan,
                      [key]: type === "number" ? Number(e.target.value) || null : e.target.value,
                    })
                  }
                  className="w-full rounded-md border border-[var(--workspace-border)] px-3 py-2"
                />
              )}
            </dd>
          </div>
        ))}
      </dl>
      {!readOnly && (
        <Button type="button" className="mt-4" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save nutrition plan"}
        </Button>
      )}
    </div>
  );
}
