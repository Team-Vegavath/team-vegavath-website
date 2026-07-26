import type { ReactNode } from "react";

import F1Nav from "@/components/f1/F1Nav";
import { Container } from "@/components/ui/Container";

// Thin wrapper: no auth, inherits the root layout's Navbar and Footer. It only
// owns the page chrome (padding + sub-nav) so every /f1 page shares one shell.
export default function F1Layout({ children }: { children: ReactNode }) {
  return (
    <main
      style={{
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        minHeight: "100vh",
      }}
    >
      <section style={{ width: "100%", padding: "9rem 0 6rem" }}>
        <Container>
          <F1Nav />
          {children}
        </Container>
      </section>
    </main>
  );
}
