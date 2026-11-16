"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { MEMBER_GENDER_LABELS, type MemberGender } from "@/lib/member-intake";

export function MemberIntakeForm({
  centres,
}: {
  centres: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<MemberGender | "">("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [centreId, setCentreId] = useState(centres[0]?.id ?? "");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [intakeFeedback, setIntakeFeedback] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<"created" | "failed" | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [createdMemberId, setCreatedMemberId] = useState<string | null>(null);

  function resetForm() {
    setFirstName("");
    setLastName("");
    setDateOfBirth("");
    setGender("");
    setPhone("");
    setEmail("");
    setEmergencyContactName("");
    setEmergencyContactPhone("");
    setIntakeFeedback("");
    setIdFile(null);
    setResult(null);
    setErrors([]);
    setCreatedMemberId(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setErrors([]);

    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intakeOnly: true,
        firstName,
        lastName,
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || undefined,
        phone,
        email: email || undefined,
        centreId: centreId || undefined,
        emergencyContactName: emergencyContactName || undefined,
        emergencyContactPhone: emergencyContactPhone || undefined,
        intakeFeedback: intakeFeedback || undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setLoading(false);
      setResult("failed");
      setErrors(
        Array.isArray(data.errors)
          ? data.errors
          : [data.error ?? "Member was not created. Check required fields."],
      );
      return;
    }

    const memberId = data.member?.id as string | undefined;
    if (memberId && idFile) {
      const form = new FormData();
      form.append("file", idFile);
      const up = await fetch(`/api/members/${memberId}/id-document`, {
        method: "POST",
        body: form,
      });
      if (!up.ok) {
        const upData = await up.json().catch(() => ({}));
        setLoading(false);
        setResult("failed");
        setErrors([upData.error ?? "Member created but ID upload failed."]);
        setCreatedMemberId(memberId);
        return;
      }
    }

    setLoading(false);
    setResult("created");
    setCreatedMemberId(memberId ?? null);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        New member intake
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <form
        onSubmit={submit}
        className="my-4 w-full max-w-lg rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Screen 1 — Member intake</h2>
        <p className="mt-1 text-xs text-[var(--workspace-muted)]">
          Creates the member profile only. Add membership on the next step from the member record.
        </p>

        {result === "created" && (
          <div className="mt-4 rounded-lg border border-[var(--emerald-neon)]/40 bg-[var(--emerald-neon-tint)] p-3 text-sm">
            <p className="font-semibold text-[var(--status-success)]">Output: Member created</p>
            {createdMemberId && (
              <Link
                href={`/app/clients/${createdMemberId}`}
                className="mt-1 inline-block text-[var(--workspace-accent)] hover:underline"
              >
                Open profile →
              </Link>
            )}
          </div>
        )}

        {result === "failed" && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
            <p className="font-semibold">Output: No — member not created</p>
            <ul className="mt-1 list-disc pl-4">
              {errors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {centres.length > 0 && (
            <label className="block text-xs font-medium text-[var(--workspace-muted)] sm:col-span-2">
              Branch
              <select
                required
                value={centreId}
                onChange={(e) => setCentreId(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
              >
                {centres.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-xs font-medium text-[var(--workspace-muted)]">
            First name
            <input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-[var(--workspace-muted)]">
            Last name
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-[var(--workspace-muted)]">
            Date of birth
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-[var(--workspace-muted)]">
            Gender
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as MemberGender | "")}
              className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
            >
              <option value="">Select</option>
              {(Object.entries(MEMBER_GENDER_LABELS) as [MemberGender, string][]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-[var(--workspace-muted)]">
            Contact #
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-[var(--workspace-muted)]">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-[var(--workspace-muted)] sm:col-span-2">
            ID to upload
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-[var(--workspace-muted)]">
            SOS contact name
            <input
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-[var(--workspace-muted)]">
            SOS contact number
            <input
              type="tel"
              value={emergencyContactPhone}
              onChange={(e) => setEmergencyContactPhone(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-[var(--workspace-muted)] sm:col-span-2">
            Feedback
            <textarea
              rows={2}
              value={intakeFeedback}
              onChange={(e) => setIntakeFeedback(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Create member"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setOpen(false);
              resetForm();
            }}
          >
            Close
          </Button>
        </div>
      </form>
    </div>
  );
}