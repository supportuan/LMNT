"use client";

import { useRouter } from "next/navigation";

export function MemberQuerySelect({
  members,
  memberId,
  basePath,
}: {
  members: { id: string; name: string }[];
  memberId: string;
  basePath: string;
}) {
  const router = useRouter();
  return (
    <select
      className="neu-input w-full max-w-md"
      value={memberId}
      onChange={(e) => router.push(`${basePath}?memberId=${e.target.value}`)}
    >
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}