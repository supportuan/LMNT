import Link from "next/link";
import { Panel } from "@/components/ui";
import { MEMBER_GENDER_LABELS, memberFullName } from "@/lib/member-intake";
import type { members } from "@/db/schema";

type MemberRow = typeof members.$inferSelect;

export function MemberIntakePanel({ member }: { member: MemberRow }) {
  const hasIntake =
    member.firstName ||
    member.phone ||
    member.emergencyContactName ||
    member.intakeFeedback;

  if (!hasIntake) return null;

  return (
    <Panel title="Intake profile">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[var(--workspace-muted)]">Legal name</dt>
          <dd className="font-medium">{memberFullName(member)}</dd>
        </div>
        <div>
          <dt className="text-[var(--workspace-muted)]">Date of birth</dt>
          <dd className="font-medium">
            {member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString() : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--workspace-muted)]">Gender</dt>
          <dd className="font-medium">
            {member.gender ? MEMBER_GENDER_LABELS[member.gender] : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--workspace-muted)]">Contact</dt>
          <dd className="font-medium">{member.phone ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--workspace-muted)]">Email</dt>
          <dd className="font-medium">{member.email ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--workspace-muted)]">SOS contact</dt>
          <dd className="font-medium">
            {member.emergencyContactName
              ? `${member.emergencyContactName} · ${member.emergencyContactPhone ?? ""}`
              : "—"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[var(--workspace-muted)]">Feedback</dt>
          <dd className="font-medium">{member.intakeFeedback ?? "—"}</dd>
        </div>
        {member.idDocumentKey && (
          <div className="sm:col-span-2">
            <dt className="text-[var(--workspace-muted)]">Government ID</dt>
            <dd>
              <Link
                href={`/api/members/${member.id}/id-document`}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--workspace-accent)] hover:underline"
              >
                {member.idDocumentFilename ?? "View ID"}
              </Link>
            </dd>
          </div>
        )}
      </dl>
    </Panel>
  );
}