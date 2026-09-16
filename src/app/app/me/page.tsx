import { redirect } from "next/navigation";
import { TrainerProfileSettings } from "@/components/trainer/trainer-profile-settings";
import { PageHeader } from "@/components/ui";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getScheduleBlocks, getTrainerProfile, getTrainerSettings } from "@/modules/trainer-queries";

export default async function MePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "me")) redirect(getRoleHome(session.activeRole));

  const [settings, blocks, profile] = await Promise.all([
    getTrainerSettings(session),
    getScheduleBlocks(session),
    getTrainerProfile(session),
  ]);

  const gymName =
    session.centreIds.map((id) => session.centreNames[id]).filter(Boolean).join(", ") || "—";

  return (
    <>
      <PageHeader
        title="Profile / Settings"
        description="Trainer profile, gym details, notifications, and account."
      />
      <TrainerProfileSettings
        name={session.name}
        email={session.email}
        organisationName={session.organisationName}
        gymName={gymName}
        timezone="Asia/Kolkata"
        profile={{
          bio: profile?.bio ?? "",
          specialties: profile?.specialties ?? [],
          sessionsPerWeek: profile?.sessionsPerWeek ?? "3–5 sessions / week",
          visible: profile?.marketplaceVisible ?? true,
        }}
        settings={settings}
        blocks={blocks}
      />
    </>
  );
}
