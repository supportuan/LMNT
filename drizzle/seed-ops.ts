import "./load-env";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import {
  assets,
  inventoryItems,
  members,
  onboardingAssignments,
  users,
} from "../src/db/schema";

async function seedOps() {
  const [trainer] = await db
    .select()
    .from(users)
    .where(eq(users.email, "trainer.indiranagar@lmnt.local"))
    .limit(1);
  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.email, "client.indiranagar@lmnt.local"))
    .limit(1);

  if (!trainer || !member) {
    console.log("Run npm run db:seed first");
    process.exit(1);
  }

  const existing = await db.select().from(onboardingAssignments).limit(1);
  if (existing.length > 0) {
    console.log("Ops data already seeded.");
    return;
  }

  await db.insert(onboardingAssignments).values({
    organisationId: member.organisationId,
    centreId: member.centreId,
    memberId: member.id,
    trainerId: trainer.id,
    status: "in_progress",
    dueAt: new Date(Date.now() + 3 * 86400000),
    checklist: [
      { item: "PAR-Q and readiness assessment", done: true },
      { item: "Goal setting consultation", done: true },
      { item: "Movement screen", done: false },
      { item: "First programme assignment", done: false },
      { item: "App walkthrough and check-in demo", done: false },
    ],
  });

  await db.insert(assets).values([
    {
      organisationId: member.organisationId,
      centreId: member.centreId,
      name: "Squat rack #1",
      category: "strength",
      serialNumber: "SQ-IN-001",
      status: "operational",
    },
    {
      organisationId: member.organisationId,
      centreId: member.centreId,
      name: "Treadmill #3",
      category: "cardio",
      serialNumber: "TM-IN-003",
      status: "maintenance",
    },
  ]);

  await db.insert(inventoryItems).values([
    {
      organisationId: member.organisationId,
      centreId: member.centreId,
      name: "Resistance bands",
      sku: "RB-001",
      quantity: 24,
      reorderLevel: 10,
    },
    {
      organisationId: member.organisationId,
      centreId: member.centreId,
      name: "Cleaning wipes",
      sku: "CW-001",
      quantity: 4,
      reorderLevel: 5,
    },
  ]);

  console.log("Ops + onboarding data seeded.");
}

seedOps().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
