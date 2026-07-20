import { Navbar } from "@/components/layout/Navbar";
import DocsSidebar from "@/components/docs/DocsSidebar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Docs", template: "%s | Vegavath Docs" },
};

// Navbar is fixed at 72px tall (see Navbar.tsx nav height), so the docs
// body is offset by that exact amount to sit flush beneath it.
const NAV_HEIGHT = "72px";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <div
        style={{
          display: "flex",
          minHeight: `calc(100vh - ${NAV_HEIGHT})`,
          background: "var(--bg-base)",
          paddingTop: NAV_HEIGHT,
        }}
      >
        {/* Sidebar */}
        <aside
          style={{
            width: "260px",
            flexShrink: 0,
            borderRight: "1px solid var(--border)",
            position: "sticky",
            top: NAV_HEIGHT,
            height: `calc(100vh - ${NAV_HEIGHT})`,
            overflowY: "auto",
            padding: "2rem 0",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <DocsSidebar />
        </aside>

        {/* Content */}
        <main
          style={{
            flex: 1,
            maxWidth: "800px",
            padding: "2.5rem 3rem",
            overflowX: "hidden",
          }}
        >
          {children}
        </main>
      </div>
    </>
  );
}
