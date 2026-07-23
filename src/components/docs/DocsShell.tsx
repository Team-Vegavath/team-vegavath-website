"use client";

import { useState } from "react";
import DocsSidebar from "@/components/docs/DocsSidebar";

export default function DocsShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="docs-layout">
      <div className="docs-mobile-bar">
        <span className="docs-mobile-bar-label">Documentation</span>
        <button
          className="docs-hamburger"
          onClick={() => setSidebarOpen(v => !v)}
          aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
        >
          {sidebarOpen ? "CLOSE" : "MENU"}
        </button>
      </div>

      <div
        className="docs-sidebar-wrapper"
        data-open={sidebarOpen ? "true" : "false"}
      >
        <DocsSidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      <main className="docs-content-wrapper">
        {children}
      </main>
    </div>
  );
}
