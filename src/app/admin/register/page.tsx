import type { Metadata } from "next";
import { redirect } from "next/navigation";

import AdminRegisterForm from "@/components/admin/AdminRegisterForm";
import { getNamedInviteSlug, getOpenInviteToken } from "@/lib/services/admin";

export const metadata: Metadata = {
  title: "Viewer Registration",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// PUBLIC page (middleware exempts /admin/register) - the S48 open viewer link
// lands here. Lives outside the (admin) route group on purpose, exactly like
// /admin/invite/[name]/[token], so it gets no AdminShell chrome and no
// session gate: the token in the query string is the only credential.
export default async function OpenRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token: rawToken } = await searchParams;
  const token = (rawToken ?? "").trim();

  const invite = token
    ? await getOpenInviteToken(token).catch(() => null)
    : null;

  if (!invite) {
    // A named token pasted into the flat URL still works -- send it to its
    // canonical page, which pre-fills the invitee name.
    const namedSlug = token
      ? await getNamedInviteSlug(token).catch(() => null)
      : null;
    if (namedSlug) redirect(`/admin/invite/${namedSlug}/${token}`);

    return (
      <div
        style={{
          minHeight: "100svh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#0d0d0d",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "26rem",
            background: "#141414",
            border: "1px solid #262626",
            padding: "40px 28px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-chakra), sans-serif",
              fontWeight: 700,
              fontSize: "1.25rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-primary)",
              marginBottom: "12px",
            }}
          >
            Invalid invite link
          </div>
          <p
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.8rem",
              lineHeight: 1.7,
              color: "var(--text-muted)",
            }}
          >
            This invite link is invalid, expired, or has been revoked.
            Ask the admin for a fresh link.
          </p>
        </div>
      </div>
    );
  }

  return <AdminRegisterForm token={token} open />;
}
