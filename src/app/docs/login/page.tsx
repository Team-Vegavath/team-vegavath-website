"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// S52B: deliberately at src/app/docs/login/, OUTSIDE the (docs) route group.
// src/app/(docs)/docs/layout.tsx renders Navbar + DocsShell, and a nested
// layout.tsx nests INSIDE its parent rather than replacing it, so a page under
// (docs)/docs/ cannot escape the sidebar. This is a different filesystem
// branch, so it inherits only the root layout. Do not "tidy" it into the group.
export default function DocsLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/docs/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push("/docs");
      router.refresh();
    } else {
      setError("Incorrect password");
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)", padding: "1.5rem" }}>
      <section style={{ width: "100%", maxWidth: "380px" }}>
        <h1 className="heading" style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-primary)" }}>
          INTERNAL DOCS
        </h1>
        <p className="mono" style={{ marginTop: "0.5rem", marginBottom: "2rem", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--text-muted)" }}>
          Team access only
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <label htmlFor="docs-password" className="sr-only">
            Password
          </label>
          <input
            id="docs-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoFocus
            style={{ width: "100%", borderRadius: 0, border: "1px solid var(--border-strong)", background: "var(--bg-base)", padding: "0.875rem 1rem", fontSize: "1rem", color: "var(--text-primary)", boxSizing: "border-box", outline: "none" }}
          />

          {error ? (
            <p className="mono" style={{ fontSize: "0.72rem", letterSpacing: "0.08em", color: "var(--error)" }}>
              {error}
            </p>
          ) : null}

          <button type="submit" className="btn-primary" disabled={busy} style={{ width: "100%", padding: "0.9rem 1rem" }}>
            {busy ? "CHECKING" : "ENTER"}
          </button>
        </form>
      </section>
    </main>
  );
}
