import "./load-env";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { members, programmes, sessions, users } from "../src/db/schema";

function weekSlot(dayOffset: number, hour: number, minute = 0) {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function seedSchedule() {
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

  const [programme] = await db
    .select()
    .from(programmes)
    .where(eq(programmes.memberId, member.id))
    .limit(1);

  if (!trainer || !member || !programme) {
    throw new Error("Run npm run db:seed first");
  }

  await db.insert(sessions).values([
    {
      organisationId: member.organisationId,
      centreId: member.centreId,
      memberId: member.id,
      trainerId: trainer.id,
      programmeId: programme.id,
      status: "scheduled",
      scheduledAt: weekSlot(0, 7),
    },
    {
      organisationId: member.organisationId,
      centreId: member.centreId,
      memberId: member.id,
      trainerId: trainer.id,
      programmeId: programme.id,
      status: "scheduled",
      scheduledAt: weekSlot(2, 10, 30),
    },
    {
      organisationId: member.organisationId,
      centreId: member.centreId,
      memberId: member.id,
      trainerId: trainer.id,
      programmeId: programme.id,
      status: "in_progress",
      scheduledAt: weekSlot(4, 17),
    },
    {
      organisationId: member.organisationId,
      centreId: member.centreId,
      memberId: member.id,
      trainerId: trainer.id,
      programmeId: programme.id,
      status: "scheduled",
      scheduledAt: weekSlot(5, 8),
    },
  ]);

  console.log("Added trainer schedule sessions for this week.");
}

seedSchedule()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
