import type { Metadata } from "next";

import AdminRegisterForm from "@/components/admin/AdminRegisterForm";
import { getInviteToken } from "@/lib/services/admin";

export const metadata: Metadata = {
  title: "Admin Registration | Team Vegavath",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// PUBLIC page (middleware exempts /admin/invite/) - reachable only via a
// one-time invite token URL. Lives outside the (admin) route group on purpose
// so it gets no AdminShell chrome.
export default async function InvitePage({
  params,
}: {
  params: Promise<{ name: string; token: string }>;
}) {
  const { name, token } = await params;
  const invite = await getInviteToken(token, name).catch(() => null);

  if (!invite) {
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
            This link is invalid, expired, or has already been used.
            Ask the admin for a fresh invite link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AdminRegisterForm
      token={token}
      nameSlug={name}
      prefilledName={(invite as { invitee_name: string | null }).invitee_name ?? ""}
    />
  );
}
