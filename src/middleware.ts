import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Maintenance mode - toggled via Vercel env var. NEXT_PUBLIC_* so it is
  // inlined at the Edge; flipping it in Vercel triggers a redeploy anyway.
  // Admin and API stay reachable so it can be turned off from the panel.
  if (
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true" &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api") &&
    pathname !== "/maintenance"
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
