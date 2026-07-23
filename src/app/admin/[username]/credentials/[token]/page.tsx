import type { Metadata } from "next";

import ResetPasswordForm from "@/components/admin/ResetPasswordForm";
import { getPasswordResetToken } from "@/lib/services/admin";

export const metadata: Metadata = {
  title: "Password Reset",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// PUBLIC page (middleware exempts /admin/*/credentials/*) - reachable only
// via a one-time reset token URL. Lives outside the (admin) route group on
// purpose so it gets no AdminShell chrome.
export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ username: string; token: string }>;
}) {
  const { username, token } = await params;
  const row = await getPasswordResetToken(token).catch(() => null);

  // The token must exist AND belong to the username baked into the URL
  if (!row || (row as { username: string }).username !== username) {
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
            Invalid reset link
          </div>
          <p
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.8rem",
              lineHeight: 1.7,
              color: "var(--text-muted)",
            }}
          >
            This password reset link has expired or is invalid.
            Ask the admin for a fresh one.
          </p>
        </div>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
