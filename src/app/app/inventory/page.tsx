import { redirect } from "next/navigation";
import { AddInventoryForm } from "@/components/operations/add-inventory-form";
import { InventoryQuantityEditor } from "@/components/operations/inventory-quantity-editor";
import { Badge, DataTable, PageHeader } from "@/components/ui";
import { canAccessModule } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getCentresForSession, getInventory } from "@/modules/queries";

export default async function InventoryPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "inventory")) redirect("/login");

  const [items, centres] = await Promise.all([
    getInventory(session),
    getCentresForSession(session),
  ]);

  return (
    <>
      <PageHeader
        title="Inventory management"
        description="Supplies, consumables, and reorder levels for your centre."
        action={centres.length > 0 ? <AddInventoryForm centres={centres} /> : undefined}
      />
      <DataTable
        headers={["Item", "SKU", "Qty / Reorder", "Branch", "Status"]}
        rows={items.map((item) => [
          item.name,
          item.sku ?? "—",
          <InventoryQuantityEditor
            key={`qty-${item.id}`}
            itemId={item.id}
            quantity={item.quantity}
            reorderLevel={item.reorderLevel}
            unit={item.unit}
          />,
          session.centreNames[item.centreId] ?? "—",
          <Badge key={item.id} tone={item.quantity <= item.reorderLevel ? "warning" : "success"}>
            {item.quantity <= item.reorderLevel ? "Low stock" : "OK"}
          </Badge>,
        ])}
      />
    </>
  );
}
