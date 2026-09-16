import { Badge, DataTable } from "@/components/ui";

export function TrainerUtilisationTable({
  trainers,
}: {
  trainers: {
    name: string;
    centreName: string;
    sessions30d: number;
    monthlyCapacity: number;
    utilisation: number;
    revenue?: number;
  }[];
}) {
  if (trainers.length === 0) {
    return <p className="text-sm text-[var(--workspace-muted)]">No trainers in scope.</p>;
  }

  return (
    <DataTable
      headers={["Trainer", "Branch", "Sessions (30d)", "Capacity", "Revenue", "Utilisation"]}
      rows={trainers.map((t) => [
        t.name,
        t.centreName,
        t.sessions30d,
        t.monthlyCapacity,
        t.revenue != null ? `₹${t.revenue.toLocaleString("en-IN")}` : "—",
        <Badge
          key={t.name}
          tone={t.utilisation > 85 ? "warning" : t.utilisation > 60 ? "success" : "neutral"}
        >
          {t.utilisation}%
        </Badge>,
      ])}
    />
  );
}
