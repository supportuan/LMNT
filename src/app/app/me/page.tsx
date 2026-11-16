import { redirect } from "next/navigation";
import { TrainerProfileSettings } from "@/components/trainer/trainer-profile-settings";
import { PageHeader } from "@/components/ui";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getTrainerProfile, getTrainerSettings } from "@/modules/trainer-queries";

export default async function MePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "me")) redirect(getRoleHome(session.activeRole));

  const [settings, profile] = await Promise.all([getTrainerSettings(session), getTrainerProfile(session)]);

  const gymName =
    session.centreIds.map((id) => session.centreNames[id]).filter(Boolean).join(", ") || "—";

  return (
    <>
      <PageHeader
        title="Me"
        description="Protect your boundaries, shut down on time, and keep a weekly review."
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
      />
    </>
  );
}
