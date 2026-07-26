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
