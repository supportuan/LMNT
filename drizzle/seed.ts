import "./load-env";
import { and, eq } from "drizzle-orm";
import { db } from "../src/db";
import { buildFourWeekPlan } from "../src/lib/coach-pro/engine";
import {
  assessments,
  assets,
  attendanceRecords,
  auditEntries,
  centres,
  clientCheckIns,
  coachingRelationships,
  inventoryItems,
  leads,
  memberPlans,
  members,
  agreementMonthlyReviews,
  communityGroupMembers,
  communityGroups,
  messages,
  nutritionPlans,
  partnerOffers,
  partners,
  serviceAgreements,
  onboardingAssignments,
  organisationMemberships,
  orgPackages,
  organisations,
  paymentRecords,
  programmes,
  progressSnapshots,
  roleAssignments,
  scheduleBlocks,
  sessionFeedback,
  sessions,
  tasks,
  trainerCredentials,
  trainerProfiles,
  trainerSettings,
  users,
} from "../src/db/schema";
import { hashPassword } from "../src/lib/auth";

const ORG_SLUG = "lmnt-fitness-club";

function demoAssets(orgId: string, indiranagarId: string, koramangalaId: string, trainerId: string) {
  return [
    {
      organisationId: orgId,
      centreId: indiranagarId,
      name: "Squat rack #1",
      category: "strength",
      serialNumber: "SQ-IN-001",
      location: "Free weights floor",
      purchaseDate: new Date("2024-01-15"),
      purchaseCost: 85000,
      status: "operational" as const,
      assignedTrainerId: trainerId,
      assignedArea: "Strength zone",
      warrantyUntil: new Date("2027-01-15"),
      lastServiceAt: new Date("2026-07-01"),
      nextMaintenanceAt: new Date("2026-10-01"),
    },
    {
      organisationId: orgId,
      centreId: indiranagarId,
      name: "Treadmill #3",
      category: "cardio",
      serialNumber: "TM-IN-003",
      location: "Cardio deck",
      purchaseDate: new Date("2023-11-08"),
      purchaseCost: 120000,
      status: "maintenance" as const,
      assignedArea: "Cardio deck",
      warrantyUntil: new Date("2026-11-08"),
      lastServiceAt: new Date("2026-08-20"),
      nextMaintenanceAt: new Date(),
      notes: "Belt slipping — service booked",
    },
    {
      organisationId: orgId,
      centreId: koramangalaId,
      name: "Cable machine",
      category: "strength",
      serialNumber: "CB-KO-001",
      location: "Functional zone",
      purchaseDate: new Date("2024-03-02"),
      purchaseCost: 95000,
      status: "operational" as const,
      assignedArea: "Functional zone",
      warrantyUntil: new Date("2027-03-02"),
      lastServiceAt: new Date("2026-06-12"),
      nextMaintenanceAt: new Date("2026-12-12"),
    },
    {
      organisationId: orgId,
      centreId: indiranagarId,
      name: "Rowing machine #2",
      category: "cardio",
      serialNumber: "RW-IN-002",
      location: "Cardio deck",
      purchaseDate: new Date("2022-08-19"),
      purchaseCost: 64000,
      status: "down" as const,
      assignedArea: "Cardio deck",
      lastServiceAt: new Date("2026-04-01"),
      notes: "Rail damaged — awaiting parts",
    },
    {
      organisationId: orgId,
      centreId: koramangalaId,
      name: "Smith machine",
      category: "strength",
      serialNumber: "SM-KO-004",
      location: "Storage",
      purchaseDate: new Date("2019-05-10"),
      purchaseCost: 72000,
      status: "down" as const,
      retiredAt: new Date("2026-01-15"),
      notes: "Retired — replaced by squat rack",
    },
  ];
}

async function refreshExistingSeed() {
  const [org] = await db
    .select()
    .from(organisations)
    .where(eq(organisations.slug, ORG_SLUG))
    .limit(1);

  if (!org) return false;

  const [trainer] = await db
    .select()
    .from(users)
    .where(eq(users.email, "trainer.indiranagar@lmnt.local"))
    .limit(1);

  const [clientUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, "client.indiranagar@lmnt.local"))
    .limit(1);

  if (!trainer || !clientUser) {
    console.log("Organisation exists but demo users missing — run with fresh DB or db:reset.");
    return true;
  }

  await db
    .update(users)
    .set({ phone: "+919876500001" })
    .where(eq(users.id, trainer.id));

  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.organisationId, org.id), eq(members.userId, clientUser.id)))
    .limit(1);

  if (!member) {
    console.log("Organisation exists but demo client missing.");
    return true;
  }

  const programmeWeeks = buildFourWeekPlan(4, "muscle");
  const programmeContent = {
    weeks: programmeWeeks,
    goal: "muscle",
    daysPerWeek: 4,
    markdown: "Week 1 Day 1: Squat, Hinge, Push, Pull, Core — 3×8-10 @ RPE 7-8",
  };

  const [existingProgramme] = await db
    .select()
    .from(programmes)
    .where(and(eq(programmes.memberId, member.id), eq(programmes.status, "active")))
    .limit(1);

  if (existingProgramme) {
    await db
      .update(programmes)
      .set({ content: programmeContent })
      .where(eq(programmes.id, existingProgramme.id));
    console.log("Updated active programme content for demo client.");
  } else {
    const [indiranagar] = await db
      .select()
      .from(centres)
      .where(and(eq(centres.organisationId, org.id), eq(centres.slug, "indiranagar")))
      .limit(1);
    if (indiranagar) {
      await db.insert(programmes).values({
        organisationId: org.id,
        centreId: indiranagar.id,
        memberId: member.id,
        trainerId: trainer.id,
        title: "Foundation Strength Block 1",
        status: "active",
        startsAt: new Date(),
        content: programmeContent,
      });
      console.log("Created active programme for demo client.");
    }
  }

  await db.delete(nutritionPlans).where(eq(nutritionPlans.memberId, member.id));
  const [indiranagar] = await db
    .select()
    .from(centres)
    .where(and(eq(centres.organisationId, org.id), eq(centres.slug, "indiranagar")))
    .limit(1);

  if (indiranagar) {
    await db.insert(nutritionPlans).values({
      organisationId: org.id,
      centreId: indiranagar.id,
      memberId: member.id,
      trainerId: trainer.id,
      calories: 2200,
      protein: 160,
      carbs: 220,
      fat: 70,
      dietPreference: "Balanced",
      mealStructure: "3 meals + 1 snack",
      mealTiming: "Pre/post workout carbs",
    });
  }

  const existingMessages = await db
    .select({ id: messages.id })
    .from(messages)
    .where(eq(messages.memberId, member.id))
    .limit(1);

  if (existingMessages.length === 0) {
    await db.insert(messages).values({
      organisationId: org.id,
      memberId: member.id,
      trainerId: trainer.id,
      senderId: trainer.id,
      body: "Great work last session — keep protein high this week.",
    });
  }

  const existingPartners = await db
    .select({ id: partners.id })
    .from(partners)
    .where(eq(partners.organisationId, org.id))
    .limit(1);

  if (existingPartners.length === 0 && indiranagar) {
    const [admin] = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@lmnt.local"))
      .limit(1);

    const [nutritionPartner] = await db
      .insert(partners)
      .values({
        organisationId: org.id,
        centreId: indiranagar.id,
        name: "FuelHub Nutrition",
        category: "nutrition",
        description: "Member pricing on meal plans and supplements for LMNT clients.",
        commissionBps: 800,
      })
      .returning();

    await db.insert(partnerOffers).values({
      organisationId: org.id,
      partnerId: nutritionPartner.id,
      title: "Starter meal plan",
      description: "4-week macro-aligned plan with coach check-in notes.",
      memberPriceInr: 2999,
    });

    const [morningGroup] = await db
      .insert(communityGroups)
      .values({
        organisationId: org.id,
        centreId: indiranagar.id,
        name: "Indiranagar Morning Crew",
        description: "Early lifters sharing wins, form clips, and accountability.",
        createdBy: trainer.id,
      })
      .returning();

    await db.insert(communityGroupMembers).values([
      { groupId: morningGroup.id, userId: trainer.id, role: "owner" },
      { groupId: morningGroup.id, userId: clientUser.id, role: "member" },
    ]);

    if (admin) {
      const [activeAgreement] = await db
        .insert(serviceAgreements)
        .values({
          organisationId: org.id,
          centreId: indiranagar.id,
          partnerId: nutritionPartner.id,
          title: "FuelHub branch referral agreement",
          terms: "LMNT refers active members; FuelHub provides member-tier pricing.",
          status: "active",
          startsAt: new Date(),
          createdBy: admin.id,
        })
        .returning();

      await db.insert(agreementMonthlyReviews).values({
        agreementId: activeAgreement.id,
        periodLabel: "2026-09",
        status: "pending",
      });
    }

    console.log("Seeded community + commerce demo data.");
  }

  const existingProgress = await db
    .select({ id: progressSnapshots.id })
    .from(progressSnapshots)
    .where(eq(progressSnapshots.memberId, member.id))
    .limit(1);

  if (existingProgress.length === 0) {
    await db.insert(progressSnapshots).values({
      organisationId: org.id,
      memberId: member.id,
      trainerId: trainer.id,
      weight: 78,
      bodyFat: 18,
      recordedAt: new Date(Date.now() - 7 * 86400000),
    });
  }

  const [existingSettings] = await db
    .select({ id: trainerSettings.id })
    .from(trainerSettings)
    .where(
      and(
        eq(trainerSettings.userId, trainer.id),
        eq(trainerSettings.organisationId, org.id),
      ),
    )
    .limit(1);

  if (!existingSettings && indiranagar) {
    await db.insert(trainerSettings).values({
      organisationId: org.id,
      userId: trainer.id,
      maxConsecutiveSessions: 4,
      trainingDays: "Mon, Wed, Fri",
      trainingTime: "3–4pm",
      mealWindow: "1–2pm",
      top3: ["Deliver great sessions", "Follow up on renewals", "Protect recovery time"],
      nonNegotiables: [
        { label: "Deep work block", done: false },
        { label: "Admin shutdown", done: false },
        { label: "Recovery protected", done: true },
      ],
    });

    await db.insert(scheduleBlocks).values([
      {
        organisationId: org.id,
        centreId: indiranagar.id,
        trainerId: trainer.id,
        dayOfWeek: 1,
        timeSlot: "3–4pm",
        blockType: "life",
        label: "Own training",
      },
      {
        organisationId: org.id,
        centreId: indiranagar.id,
        trainerId: trainer.id,
        dayOfWeek: 5,
        timeSlot: "6–7pm",
        blockType: "shutdown",
        label: "Week shutdown",
      },
    ]);
  }

  await db
    .update(memberPlans)
    .set({
      totalSessions: 12,
      sessionsRemaining: 9,
      packageValue: 48000,
      amountDue: 12000,
    })
    .where(eq(memberPlans.memberId, member.id));

  const [existingPackages] = await db
    .select({ id: orgPackages.id })
    .from(orgPackages)
    .where(eq(orgPackages.organisationId, org.id))
    .limit(1);

  if (!existingPackages && indiranagar) {
    await db.insert(orgPackages).values([
      {
        organisationId: org.id,
        name: "PT 12-pack",
        sessionCount: 12,
        priceInr: 48000,
        trainerShareBps: 5000,
        description: "Premium 1:1 coaching — 12 sessions",
      },
      {
        organisationId: org.id,
        name: "PT 24-pack",
        sessionCount: 24,
        priceInr: 84000,
        trainerShareBps: 5000,
        description: "Committed coaching block — 24 sessions",
      },
    ]);
  }

  if (indiranagar) {
    const [koramangala] = await db
      .select()
      .from(centres)
      .where(and(eq(centres.organisationId, org.id), eq(centres.slug, "koramangala")))
      .limit(1);

    await db.delete(assets).where(eq(assets.organisationId, org.id));
    await db.insert(assets).values(
      demoAssets(org.id, indiranagar.id, koramangala?.id ?? indiranagar.id, trainer.id),
    );

    const [plan] = await db
      .select()
      .from(memberPlans)
      .where(eq(memberPlans.memberId, member.id))
      .limit(1);
    if (plan) {
      await db
        .update(memberPlans)
        .set({ endsAt: new Date(Date.now() + 10 * 86400000) })
        .where(eq(memberPlans.id, plan.id));

      const existingPay = await db
        .select({ id: paymentRecords.id })
        .from(paymentRecords)
        .where(eq(paymentRecords.memberId, member.id))
        .limit(1);
      if (existingPay.length === 0) {
        await db.insert(paymentRecords).values({
          organisationId: org.id,
          centreId: indiranagar.id,
          memberId: member.id,
          planId: plan.id,
          amountInr: 36000,
          method: "upi",
          notes: "PT pack instalment",
        });
      }
    }
  }
  console.log("Demo accounts (local seed password via SEED_PASSWORD, default password123):");
  console.log("  trainer.indiranagar@lmnt.local");
  console.log("  client.indiranagar@lmnt.local");
  return true;
}

async function seed() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Refusing to seed demo accounts in production. Set ALLOW_DEMO_SEED=true to override.");
  }

  console.log("Seeding LMNT Fitness Club...");

  const alreadySeeded = await refreshExistingSeed();
  if (alreadySeeded) return;

  const [org] = await db
    .insert(organisations)
    .values({ name: "LMNT Fitness Club", slug: ORG_SLUG })
    .returning();

  const [indiranagar, koramangala] = await db
    .insert(centres)
    .values([
      {
        organisationId: org.id,
        name: "Indiranagar",
        slug: "indiranagar",
        capacity: 250,
      },
      {
        organisationId: org.id,
        name: "Koramangala",
        slug: "koramangala",
        capacity: 200,
      },
    ])
    .returning();

  const seedPassword = process.env.SEED_PASSWORD || "password123";
  if (
    process.env.NODE_ENV === "production" &&
    seedPassword === "password123" &&
    process.env.ALLOW_DEMO_SEED !== "true"
  ) {
    throw new Error(
      "Set SEED_PASSWORD to a unique value, or set ALLOW_DEMO_SEED=true for a one-time bootstrap.",
    );
  }

  const passwordHash = await hashPassword(seedPassword);

  const userRows = await db
    .insert(users)
    .values([
      { email: "admin@lmnt.local", name: "Network Admin", passwordHash },
      {
        email: "manager.indiranagar@lmnt.local",
        name: "Priya Sharma",
        passwordHash,
      },
      {
        email: "trainer.indiranagar@lmnt.local",
        name: "Arjun Mehta",
        phone: "+919876500001",
        passwordHash,
      },
      { email: "client.indiranagar@lmnt.local", name: "Sandeep Rao", passwordHash },
      {
        email: "manager.koramangala@lmnt.local",
        name: "Kavya Nair",
        passwordHash,
      },
    ])
    .returning();

  const [admin, managerInd, trainerInd, clientUser, managerKor] = userRows;

  for (const user of userRows) {
    await db.insert(organisationMemberships).values({
      userId: user.id,
      organisationId: org.id,
      status: "active",
    });
  }

  await db.insert(roleAssignments).values([
    { userId: admin.id, organisationId: org.id, role: "admin", centreId: null },
    {
      userId: managerInd.id,
      organisationId: org.id,
      role: "centre_manager",
      centreId: indiranagar.id,
    },
    {
      userId: trainerInd.id,
      organisationId: org.id,
      role: "trainer",
      centreId: indiranagar.id,
    },
    {
      userId: clientUser.id,
      organisationId: org.id,
      role: "client",
      centreId: indiranagar.id,
    },
    {
      userId: managerKor.id,
      organisationId: org.id,
      role: "centre_manager",
      centreId: koramangala.id,
    },
  ]);

  await db.insert(trainerProfiles).values({
    userId: trainerInd.id,
    organisationId: org.id,
    centreId: indiranagar.id,
    bio: "Assessment-led strength coach — 8+ years helping busy professionals build sustainable muscle and fat loss.",
    specialties: ["Strength", "Fat loss", "Beginners"],
    sessionsPerWeek: "3–5 sessions / week",
    marketplaceVisible: true,
  });

  await db.insert(trainerCredentials).values([
    {
      organisationId: org.id,
      trainerId: trainerInd.id,
      label: "NASM-CPT",
      issuer: "National Academy of Sports Medicine",
      verified: true,
      verifiedAt: new Date(),
      verifiedBy: admin.id,
    },
    {
      organisationId: org.id,
      trainerId: trainerInd.id,
      label: "Precision Nutrition L1",
      issuer: "Precision Nutrition",
      verified: true,
      verifiedAt: new Date(),
      verifiedBy: admin.id,
    },
  ]);

  const [member] = await db
    .insert(members)
    .values({
      organisationId: org.id,
      centreId: indiranagar.id,
      userId: clientUser.id,
      name: clientUser.name,
      email: clientUser.email,
      goal: "Strength and fat loss",
      status: "active",
    })
    .returning();

  const [plan] = await db
    .insert(memberPlans)
    .values({
      organisationId: org.id,
      centreId: indiranagar.id,
      memberId: member.id,
      planName: "Premium PT + Gym",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 10 * 86400000),
      status: "active",
      totalSessions: 12,
      sessionsRemaining: 9,
      packageValue: 48000,
      amountDue: 12000,
    })
    .returning();

  await db.insert(paymentRecords).values({
    organisationId: org.id,
    centreId: indiranagar.id,
    memberId: member.id,
    planId: plan.id,
    amountInr: 36000,
    method: "upi",
    notes: "PT pack instalment",
  });

  await db.insert(trainerSettings).values({
    organisationId: org.id,
    userId: trainerInd.id,
    maxConsecutiveSessions: 4,
    trainingDays: "Mon, Wed, Fri",
    trainingTime: "3–4pm",
    mealWindow: "1–2pm",
    top3: ["Deliver great sessions", "Follow up on renewals", "Protect recovery time"],
    nonNegotiables: [
      { label: "Deep work block", done: false },
      { label: "Admin shutdown", done: false },
      { label: "Recovery protected", done: true },
    ],
  });

  await db.insert(scheduleBlocks).values([
    {
      organisationId: org.id,
      centreId: indiranagar.id,
      trainerId: trainerInd.id,
      dayOfWeek: 1,
      timeSlot: "3–4pm",
      blockType: "life",
      label: "Own training",
    },
    {
      organisationId: org.id,
      centreId: indiranagar.id,
      trainerId: trainerInd.id,
      dayOfWeek: 5,
      timeSlot: "6–7pm",
      blockType: "shutdown",
      label: "Week shutdown",
    },
  ]);

  await db.insert(coachingRelationships).values({
    organisationId: org.id,
    centreId: indiranagar.id,
    memberId: member.id,
    trainerId: trainerInd.id,
    active: true,
  });

  await db.insert(onboardingAssignments).values({
    organisationId: org.id,
    centreId: indiranagar.id,
    memberId: member.id,
    trainerId: trainerInd.id,
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

  await db.insert(assets).values(demoAssets(org.id, indiranagar.id, koramangala.id, trainerInd.id));

  await db.insert(inventoryItems).values([
    {
      organisationId: org.id,
      centreId: indiranagar.id,
      name: "Resistance bands",
      sku: "RB-001",
      quantity: 24,
      reorderLevel: 10,
      unit: "pcs",
    },
    {
      organisationId: org.id,
      centreId: indiranagar.id,
      name: "Cleaning wipes",
      sku: "CW-001",
      quantity: 4,
      reorderLevel: 5,
      unit: "boxes",
    },
    {
      organisationId: org.id,
      centreId: koramangala.id,
      name: "Protein samples",
      sku: "PS-001",
      quantity: 50,
      reorderLevel: 20,
      unit: "sachets",
    },
  ]);

  await db.insert(leads).values([
    {
      organisationId: org.id,
      centreId: indiranagar.id,
      ownerId: trainerInd.id,
      name: "Rahul Verma",
      email: "rahul@example.com",
      source: "instagram",
      stage: "consultation",
    },
    {
      organisationId: org.id,
      centreId: indiranagar.id,
      ownerId: trainerInd.id,
      name: "Ananya Iyer",
      phone: "+91 98765 43210",
      source: "referral",
      stage: "trial",
    },
    {
      organisationId: org.id,
      centreId: koramangala.id,
      name: "Vikram Singh",
      email: "vikram@example.com",
      source: "walk_in",
      stage: "new",
    },
  ]);

  await db.insert(orgPackages).values([
    {
      organisationId: org.id,
      name: "PT 12-pack",
      sessionCount: 12,
      priceInr: 48000,
      trainerShareBps: 5000,
      description: "Premium 1:1 coaching — 12 sessions",
    },
    {
      organisationId: org.id,
      name: "PT 24-pack",
      sessionCount: 24,
      priceInr: 84000,
      trainerShareBps: 5000,
      description: "Committed coaching block — 24 sessions",
    },
    {
      organisationId: org.id,
      name: "Trial intro",
      sessionCount: 3,
      priceInr: 9000,
      trainerShareBps: 4000,
      description: "3-session trial for new leads",
    },
    {
      organisationId: org.id,
      name: "PT 8-pack",
      sessionCount: 8,
      priceInr: 32000,
      trainerShareBps: 5000,
      description: "Starter 1:1 coaching — 8 sessions",
    },
    {
      organisationId: org.id,
      name: "Gym monthly",
      sessionCount: 30,
      priceInr: 8000,
      trainerShareBps: 0,
      description: "Gym floor access — no trainer share",
    },
  ]);

  const [assessment] = await db
    .insert(assessments)
    .values({
      organisationId: org.id,
      centreId: indiranagar.id,
      memberId: member.id,
      trainerId: trainerInd.id,
      status: "completed",
      parqCleared: true,
      referralRequired: false,
      scores: { squat: 72, hinge: 68, push: 75, pull: 70 },
      completedAt: new Date(),
    })
    .returning();

  const programmeWeeks = buildFourWeekPlan(4, "muscle");

  const [programme] = await db
    .insert(programmes)
    .values({
      organisationId: org.id,
      centreId: indiranagar.id,
      memberId: member.id,
      trainerId: trainerInd.id,
      title: "Foundation Strength Block 1",
      status: "active",
      startsAt: new Date(),
      content: {
        weeks: programmeWeeks,
        goal: "muscle",
        daysPerWeek: 4,
        markdown: "Week 1 Day 1: Squat, Hinge, Push, Pull, Core — 3×8-10 @ RPE 7-8",
      },
    })
    .returning();

  await db.insert(nutritionPlans).values({
    organisationId: org.id,
    centreId: indiranagar.id,
    memberId: member.id,
    trainerId: trainerInd.id,
    calories: 2200,
    protein: 160,
    carbs: 220,
    fat: 70,
    dietPreference: "Balanced",
    mealStructure: "3 meals + 1 snack",
    mealTiming: "Pre/post workout carbs",
  });

  await db.insert(messages).values({
    organisationId: org.id,
    memberId: member.id,
    trainerId: trainerInd.id,
    senderId: trainerInd.id,
    body: "Great work last session — keep protein high this week.",
  });

  await db.insert(progressSnapshots).values({
    organisationId: org.id,
    memberId: member.id,
    trainerId: trainerInd.id,
    weight: 78,
    bodyFat: 18,
    recordedAt: new Date(Date.now() - 7 * 86400000),
  });

  const [session] = await db
    .insert(sessions)
    .values({
      organisationId: org.id,
      centreId: indiranagar.id,
      memberId: member.id,
      trainerId: trainerInd.id,
      programmeId: programme.id,
      status: "completed",
      scheduledAt: new Date(Date.now() - 86400000),
      completedAt: new Date(Date.now() - 82800000),
      readinessScore: 8,
      rpe: 7,
    })
    .returning();

  function weekSlot(dayOffset: number, hour: number, minute = 0) {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff + dayOffset);
    d.setHours(hour, minute, 0, 0);
    return d;
  }

  await db.insert(sessions).values([
    {
      organisationId: org.id,
      centreId: indiranagar.id,
      memberId: member.id,
      trainerId: trainerInd.id,
      programmeId: programme.id,
      status: "scheduled",
      scheduledAt: weekSlot(0, 7),
    },
    {
      organisationId: org.id,
      centreId: indiranagar.id,
      memberId: member.id,
      trainerId: trainerInd.id,
      programmeId: programme.id,
      status: "scheduled",
      scheduledAt: weekSlot(2, 10, 30),
    },
    {
      organisationId: org.id,
      centreId: indiranagar.id,
      memberId: member.id,
      trainerId: trainerInd.id,
      programmeId: programme.id,
      status: "in_progress",
      scheduledAt: weekSlot(4, 17),
    },
    {
      organisationId: org.id,
      centreId: indiranagar.id,
      memberId: member.id,
      trainerId: trainerInd.id,
      programmeId: programme.id,
      status: "scheduled",
      scheduledAt: weekSlot(5, 8),
    },
  ]);

  await db.insert(sessionFeedback).values({
    organisationId: org.id,
    centreId: indiranagar.id,
    sessionId: session.id,
    memberScore: 9,
    coachScore: 8,
    notes: "Good session, slight knee discomfort on lunges.",
  });

  await db.insert(attendanceRecords).values({
    organisationId: org.id,
    centreId: indiranagar.id,
    memberId: member.id,
    method: "manual",
    checkedInAt: new Date(),
  });

  const [nutritionPartner] = await db
    .insert(partners)
    .values({
      organisationId: org.id,
      centreId: indiranagar.id,
      name: "FuelHub Nutrition",
      category: "nutrition",
      description: "Member pricing on meal plans and supplements for LMNT clients.",
      contactEmail: "partners@fuelhub.example",
      commissionBps: 800,
    })
    .returning();

  await db.insert(partners).values({
    organisationId: org.id,
    name: "Align Physio Collective",
    category: "physio",
    description: "Network-wide physio partner for recovery and movement screening.",
    contactEmail: "lmnt@alignphysio.example",
    commissionBps: 1000,
  });

  await db.insert(partnerOffers).values([
    {
      organisationId: org.id,
      partnerId: nutritionPartner.id,
      title: "Starter meal plan",
      description: "4-week macro-aligned plan with coach check-in notes.",
      memberPriceInr: 2999,
    },
    {
      organisationId: org.id,
      partnerId: nutritionPartner.id,
      title: "Recovery shake bundle",
      description: "Post-session protein bundle at member rate.",
      memberPriceInr: 1499,
    },
  ]);

  const [morningGroup] = await db
    .insert(communityGroups)
    .values({
      organisationId: org.id,
      centreId: indiranagar.id,
      name: "Indiranagar Morning Crew",
      description: "Early lifters sharing wins, form clips, and accountability.",
      createdBy: trainerInd.id,
    })
    .returning();

  await db.insert(communityGroups).values({
    organisationId: org.id,
    name: "LMNT Strength Club",
    description: "Network-wide group for PRs, programme tips, and event invites.",
    createdBy: admin.id,
  });

  await db.insert(communityGroupMembers).values([
    { groupId: morningGroup.id, userId: trainerInd.id, role: "owner" },
    { groupId: morningGroup.id, userId: clientUser.id, role: "member" },
  ]);

  const [activeAgreement] = await db
    .insert(serviceAgreements)
    .values({
      organisationId: org.id,
      centreId: indiranagar.id,
      partnerId: nutritionPartner.id,
      title: "FuelHub branch referral agreement",
      terms: "LMNT refers active members; FuelHub provides member-tier pricing and monthly referral reporting.",
      status: "active",
      startsAt: new Date(),
      createdBy: admin.id,
    })
    .returning();

  await db.insert(agreementMonthlyReviews).values({
    agreementId: activeAgreement.id,
    periodLabel: "2026-09",
    status: "pending",
  });

  await db.insert(tasks).values([
    {
      organisationId: org.id,
      centreId: indiranagar.id,
      ownerId: managerInd.id,
      title: "Follow up trial: Ananya Iyer",
      status: "open",
      dueAt: new Date(Date.now() + 86400000),
      triggerEvent: "TrialCompleted",
    },
    {
      organisationId: org.id,
      centreId: indiranagar.id,
      ownerId: trainerInd.id,
      title: "Review knee pain feedback from Sandeep",
      status: "open",
      dueAt: new Date(Date.now() + 43200000),
      triggerEvent: "PainFlagged",
    },
  ]);

  await db.insert(auditEntries).values({
    actorId: admin.id,
    actorRole: "admin",
    organisationId: org.id,
    action: "seed.completed",
    resourceType: "organisation",
    resourceId: org.id,
    metadata: { centres: [indiranagar.slug, koramangala.slug] },
  });

  console.log("Seed complete.");
  console.log("");
  console.log("Organisation:", org.name);
  console.log("Branches:", indiranagar.name, ",", koramangala.name);
  console.log("");
  console.log("Demo accounts (local seed password via SEED_PASSWORD, default password123):");
  console.log("  admin@lmnt.local");
  console.log("  manager.indiranagar@lmnt.local");
  console.log("  trainer.indiranagar@lmnt.local");
  console.log("  client.indiranagar@lmnt.local");
  console.log("  manager.koramangala@lmnt.local");
  console.log("");
  console.log("Assessment ID:", assessment.id);
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
