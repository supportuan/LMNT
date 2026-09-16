import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LMNT Fitness Club — Coach OS",
  description: "Multi-branch gym operating system with RBAC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
