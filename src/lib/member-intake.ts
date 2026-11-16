export type MemberGender = "male" | "female" | "other" | "prefer_not_to_say";

export function memberFullName(parts: {
  name: string;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const first = parts.firstName?.trim();
  const last = parts.lastName?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  return parts.name;
}

export function composeMemberName(firstName: string, lastName: string) {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export const MEMBER_GENDER_LABELS: Record<MemberGender, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};