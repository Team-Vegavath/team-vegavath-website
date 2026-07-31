import { auth } from "@/lib/auth";
import { getMaintenanceMode } from "@/lib/services/settings";
import { NextResponse } from "next/server";

let maintenanceCache: { value: boolean; at: number } | null = null;

async function isMaintenanceEnabled(): Promise<boolean> {
  if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true") return true;
  if (maintenanceCache && Date.now() - maintenanceCache.at < 60_000) {
    return maintenanceCache.value;
  }
  try {
    const value = (await getMaintenanceMode()) === "true";
    maintenanceCache = { value, at: Date.now() };
    return value;
  } catch {
    return false;
  }
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  // Admin and API stay reachable so maintenance can be turned off from the
  // panel; path checks first so those routes never pay for the DB lookup.
  if (
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api") &&
    pathname !== "/maintenance" &&
    (await isMaintenanceEnabled())
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/maintenance";
    return NextResponse.rewrite(url);
  }

  // Public auth pages - the token in the URL is the gate, not the session
  // (S27 invites, S29 password resets, S48 open viewer links).
  if (
    pathname.startsWith("/admin/invite/") ||
    pathname === "/admin/register" ||
    pathname === "/api/admin/register" ||
    pathname === "/api/admin/credentials/reset" ||
    /^\/admin\/[^/]+\/credentials\//.test(pathname)
  ) {
    return NextResponse.next();
  }

  // S52B: /docs password gate. These pages publish internal architecture docs
  // (auth flow, env var names, DB schema, every API route and its guards), so
  // they are no longer public. Shared secret, not per-user auth - threat model
  // in docs/superpowers/plans/2026-07-26-docs-password-gate.md. Fails OPEN when
  // DOCS_PASSWORD is unset so local dev needs no setup; robots.ts disallows
  // /docs as an independent second layer for exactly that reason.
  // /api/docs/auth is not caught here - it starts with /api, not /docs.
  if (pathname.startsWith("/docs")) {
    if (pathname === "/docs/login") return NextResponse.next();

    const docsPassword = process.env.DOCS_PASSWORD;
    // S68: the fail-open above is deliberate and UNCHANGED -- failing closed
    // would lock the docs out if the var went transiently missing mid-deploy.
    // What it lacked was a signal: an env cleanup that dropped DOCS_PASSWORD
    // republished the internal architecture docs with no error and no trace.
    // This makes that state loud in Vercel's function logs. Only the absence is
    // logged, never the value.
    if (!docsPassword) {
      console.error(
        "[docs] DOCS_PASSWORD is not set -- the /docs password gate is OPEN and every request is being served. Set it in the environment; robots.ts is the only remaining layer.",
      );
    }
    if (docsPassword && req.cookies.get("docs_session")?.value !== docsPassword) {
      return NextResponse.redirect(new URL("/docs/login", req.url));
    }
  }

  // Auth only gates /admin and /api/admin below. Everything else - including
  // the public visitor routes /bootstrap/checkin/[token] (S33, per-lead QR),
  // /bootstrap/feedback, /bootstrap/register/{stall,group} (S35 volunteer
  // self-registration) and their /api/bootstrap/* endpoints - passes through
  // with no session.
  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin";
  const isAdminApiRoute = pathname.startsWith("/api/admin");

  if ((isAdminRoute || isAdminApiRoute) && !req.auth) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
});

export const config = {
  // Everything except _next internals and static files (paths with a dot),
  // so the maintenance rewrite covers public pages too - the old matcher
  // only ran on /admin and /api/admin.
  matcher: ["/((?!_next|.*\\..*).*)"],
};
