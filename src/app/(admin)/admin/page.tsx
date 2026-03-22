import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

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
      if (
        error instanceof Error &&
        (error.message === "CredentialsSignin" ||
          error.constructor.name === "CredentialsSignin" ||
          String(error).includes("CredentialsSignin"))
      ) {
        redirect("/admin?error=invalid");
      }
      // Re-throw redirect errors so Next.js handles them correctly
      throw error;
    }
  }

  return (
    <main style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#09090b", padding: "2.5rem 1rem" }}>
      <section style={{ width: "100%", maxWidth: "28rem", borderRadius: "1rem", border: "1px solid #27272a", background: "#18181b", padding: "2.5rem", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", borderRadius: "9999px", border: "1px solid #3f3f46", padding: "0.4rem 1rem", fontSize: "0.8rem", color: "#a1a1aa", textDecoration: "none", marginBottom: "1.5rem", transition: "all 0.2s" }}>
          ← Back to site
        </Link>
        <div style={{ marginBottom: "2rem", textAlign: "center" }}>
          <div className="mb-3 text-3xl" aria-hidden="true">
            ⚠️
          </div>
          <h1 className="text-2xl font-extrabold tracking-wide text-zinc-100">
            RESTRICTED ACCESS
          </h1>
          <p className="mt-2 text-sm uppercase tracking-[0.2em] text-zinc-400">
            Authorized Personnel Only
          </p>
        </div>

        <form action={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
          <div>
            <label htmlFor="username" className="sr-only">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Enter username"
              required
              style={{ width: "100%", borderRadius: "0.5rem", border: "1px solid #3f3f46", background: "#09090b", padding: "0.875rem 1rem", fontSize: "1rem", color: "#f4f4f5", boxSizing: "border-box", outline: "none", transition: "border-color 0.2s" }}
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
              placeholder="Enter password"
              required
              style={{ width: "100%", borderRadius: "0.5rem", border: "1px solid #3f3f46", background: "#09090b", padding: "0.875rem 1rem", fontSize: "1rem", color: "#f4f4f5", boxSizing: "border-box", outline: "none", transition: "border-color 0.2s" }}
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-red-700/60 bg-red-950/50 px-3 py-2 text-sm font-medium text-red-300">
              Invalid username or password
            </p>
          ) : null}

          <button
            type="submit"
            style={{ width: "100%", borderRadius: "9999px", background: "linear-gradient(to right, #dc2626, #EF5D08)", padding: "0.875rem 1rem", fontSize: "0.95rem", fontWeight: 700, letterSpacing: "0.05em", color: "white", border: "none", cursor: "pointer", transition: "opacity 0.2s" }}
          >
            ACCESS SYSTEM
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-500">
          <p>🔒 ENCRYPTED CONNECTION</p>
          <p className="mt-1">All activities are monitored and logged</p>
        </div>
      </section>
    </main>
  );
}
