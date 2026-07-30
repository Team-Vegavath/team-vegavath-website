import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { auth, signIn } from "@/lib/auth";
import { countRecentFailedLogins, logAdminLogin } from "@/lib/services/admin";
import { GlyphMatrix } from "@/components/ui/glyph-matrix";

export const metadata: Metadata = {
  title: "Admin Login",
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
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      undefined;
    const userAgent = h.get("user-agent") ?? undefined;

    // Rate limit: 5 failed attempts per IP per 15 minutes.
    // DB-backed via admin_login_log - in-memory counters die across
    // Vercel lambdas.
    let locked = false;
    if (ip) {
      try {
        const failedCount = await countRecentFailedLogins(ip);
        locked = failedCount >= 5;
      } catch {
        // DB unavailable - allow through rather than locking everyone out
      }
    }
    // redirect() throws, so it must live outside the try/catch above
    if (locked) redirect("/admin?error=locked");

    try {
      await signIn("credentials", {
        username: formData.get("username"),
        password: formData.get("password"),
        redirectTo: "/admin/dashboard",
      });
    } catch (error) {
      // instanceof survives production minification; string/constructor-name
      // checks do not; that mismatch was crashing prod on wrong passwords.
      if (error instanceof AuthError) {
        // A DB write failure must never break the login flow
        await logAdminLogin({ success: false, ip, userAgent }).catch(() => {});
        redirect("/admin?error=invalid");
      }
      // signIn succeeds by throwing Next.js's internal redirect error,
      // so reaching here with a non-AuthError IS the success path.
      await logAdminLogin({ success: true, ip, userAgent }).catch(() => {});
      // Re-throw redirect errors so Next.js handles them correctly
      throw error;
    }
  }

  /* S60/D3: split layout -- form left, Glyph Matrix visual right. Everything
     above this line (handleLogin, the rate limit, the AuthError handling, the
     redirects) is untouched; only the shell around the form changed. The form
     JSX itself is byte-for-byte what it was, just re-parented.
     Below 768px the right panel is display:none and the left goes full width
     (.admin-login-* rules in globals.css) -- plain CSS rather than Tailwind
     responsive prefixes, matching how the rest of this project does breakpoints. */
  return (
    <main style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>
      <section
        className="admin-login-left"
        style={{ flex: "0 0 480px", display: "flex", flexDirection: "column", justifyContent: "center", padding: "3rem", borderRight: "1px solid var(--border)" }}
      >
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
              style={{ width: "100%", borderRadius: 0, border: "1px solid var(--border-strong)", background: "var(--bg-base)", padding: "0.875rem 1rem", fontSize: "1rem", color: "var(--text-primary)", boxSizing: "border-box", outline: "none" }}
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
              style={{ width: "100%", borderRadius: 0, border: "1px solid var(--border-strong)", background: "var(--bg-base)", padding: "0.875rem 1rem", fontSize: "1rem", color: "var(--text-primary)", boxSizing: "border-box", outline: "none" }}
            />
          </div>

          {error ? (
            <p style={{ border: "1px solid rgba(239, 68, 68, 0.5)", background: "rgba(239, 68, 68, 0.08)", padding: "0.6rem 0.8rem", fontSize: "0.85rem", color: "var(--error)" }}>
              {error === "locked"
                ? "Too many failed attempts. Try again in 15 minutes."
                : "Invalid username or password"}
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

      {/* Right panel: Glyph Matrix. No wrapper opacity -- the component's own
          per-cell alphas (0.05-0.5, times its bottom fade) ARE the subtlety
          mechanism, and stacking a 0.2 on top of them renders it invisible.
          It tints itself from `color: var(--accent)` rather than a color prop;
          see the component header for why a token cannot be passed to canvas. */}
      <section
        className="admin-login-right"
        style={{ flex: 1, position: "relative", overflow: "hidden", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <GlyphMatrix style={{ position: "absolute", inset: 0 }} />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "2rem" }}>
          <p className="heading" style={{ fontSize: "0.7rem", letterSpacing: "0.2em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "1rem" }}>
            Team Vegavath Admin
          </p>
          <p className="mono" style={{ fontSize: "0.65rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Authorized access only
          </p>
        </div>
      </section>
    </main>
  );
}
