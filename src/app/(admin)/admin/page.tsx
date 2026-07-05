import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { auth, signIn } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin | Team Vegavath",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  const { error } = await searchParams;

  if (session?.user?.isAdmin) {
    redirect("/admin/dashboard");
  }

  async function handleLogin(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        username: formData.get("username"),
        password: formData.get("password"),
        redirectTo: "/admin/dashboard",
      });
    } catch (error) {
      // instanceof survives production minification; string/constructor-name
      // checks do not — that mismatch was crashing prod on wrong passwords.
      if (error instanceof AuthError) {
        redirect("/admin?error=invalid");
      }
      // Re-throw redirect errors so Next.js handles them correctly
      throw error;
    }
  }

  return (
    <main style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "var(--bg-base)", padding: "2.5rem 1rem" }}>
      <section style={{ width: "100%", maxWidth: "28rem", border: "1px solid var(--border-strong)", background: "var(--bg-card)", padding: "2.5rem" }}>
        <Link
          href="/"
          className="mono"
          style={{ display: "inline-flex", alignItems: "center", fontSize: "0.75rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-secondary)", textDecoration: "none", marginBottom: "2rem" }}
        >
          ← Back to site
        </Link>
        <div style={{ marginBottom: "2rem" }}>
          <h1 className="heading" style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-primary)" }}>
            RESTRICTED ACCESS
          </h1>
          <p className="mono" style={{ marginTop: "0.5rem", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--text-muted)" }}>
            Authorized personnel only
          </p>
        </div>

        <form action={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label htmlFor="username" className="sr-only">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Username"
              required
              style={{ width: "100%", borderRadius: "4px", border: "1px solid var(--border-strong)", background: "var(--bg-base)", padding: "0.875rem 1rem", fontSize: "1rem", color: "var(--text-primary)", boxSizing: "border-box", outline: "none" }}
            />
          </div>

          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Password"
              required
              style={{ width: "100%", borderRadius: "4px", border: "1px solid var(--border-strong)", background: "var(--bg-base)", padding: "0.875rem 1rem", fontSize: "1rem", color: "var(--text-primary)", boxSizing: "border-box", outline: "none" }}
            />
          </div>

          {error ? (
            <p style={{ border: "1px solid rgba(239, 68, 68, 0.5)", background: "rgba(239, 68, 68, 0.08)", padding: "0.6rem 0.8rem", fontSize: "0.85rem", color: "var(--error)" }}>
              Invalid username or password
            </p>
          ) : null}

          <button type="submit" className="btn-primary" style={{ width: "100%", padding: "0.9rem 1rem" }}>
            SIGN IN
          </button>
        </form>

        <p className="mono" style={{ marginTop: "1.75rem", fontSize: "0.65rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          All activity is monitored and logged
        </p>
      </section>
    </main>
  );
}
