import { neon } from "@neondatabase/serverless";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Maintenance mode - driven by the admin settings toggle (site_settings).
// Local neon() instance, NOT lib/db.ts: middleware runs on the Edge and must
// stay pinned to the HTTP driver even if db.ts changes (pending dev-TCP fix).
// Cached in-memory per Edge isolate for 60s so it isn't a DB query on every
// request; a toggle flip takes effect within a minute.
// NEXT_PUBLIC_MAINTENANCE_MODE stays as an emergency override (DB down).
let maintenanceCache: { value: boolean; at: number } | null = null;

async function getMaintenanceMode(): Promise<boolean> {
  if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true") return true;
  if (maintenanceCache && Date.now() - maintenanceCache.at < 60_000) {
    return maintenanceCache.value;
  }
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql.query(
      "SELECT value FROM site_settings WHERE key = 'maintenance_mode' LIMIT 1"
    );
    const value = (rows[0] as { value: string } | undefined)?.value === "true";
    maintenanceCache = { value, at: Date.now() };
    return value;
  } catch {
    return false; // DB unreachable - fail open, keep the site up
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
    (await getMaintenanceMode())
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/maintenance";
    return NextResponse.rewrite(url);
  }

  // Public auth pages - the one-time token in the URL is the gate,
  // not the session (S27 invites, S29 password resets).
  if (
    pathname.startsWith("/admin/invite/") ||
    pathname === "/api/admin/register" ||
    pathname === "/api/admin/credentials/reset" ||
    /^\/admin\/[^/]+\/credentials\//.test(pathname)
  ) {
    return NextResponse.next();
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
