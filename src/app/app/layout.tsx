import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function OsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
