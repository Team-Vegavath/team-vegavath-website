import { Navbar } from "@/components/layout/Navbar";
import DocsShell from "@/components/docs/DocsShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Docs", template: "%s | Vegavath Docs" },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <DocsShell>{children}</DocsShell>
    </>
  );
}
