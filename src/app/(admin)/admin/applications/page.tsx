import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import ApplicationsTable from "@/components/admin/ApplicationsTable";
import { auth } from "@/lib/auth";
import { getApplications } from "@/lib/services/applications";
import type { Application, ApplicationStatus } from "@/types/settings";

export const metadata: Metadata = {
  title: "Applications | Admin",
};

export const dynamic = "force-dynamic";

// Tab set = the S19 pipeline; legacy 'reviewed'/'accepted' rows show under ALL.
const FILTER_TABS: { label: string; status: ApplicationStatus | null }[] = [
  { label: "ALL", status: null },
  { label: "PENDING", status: "pending" },
  { label: "SHORTLISTED", status: "shortlisted" },
  { label: "INTERVIEW", status: "interview" },
  { label: "SELECTED", status: "selected" },
  { label: "REJECTED", status: "rejected" },
];

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  const { status: statusParam } = await searchParams;
  const activeStatus =
    FILTER_TABS.find((tab) => tab.status === statusParam)?.status ?? null;

  const applications = await getApplications({
    status: activeStatus ?? undefined,
    limit: 200,
  }).catch(() => [] as Application[]);

  return (
    <>
      <header className="admin-page-header">
        <h1 className="admin-page-title">
          Applications{" "}
          <span
            className="mono"
            style={{ fontSize: "0.8rem", letterSpacing: "0.12em", color: "var(--text-muted)", fontWeight: 400 }}
          >
            {applications.length}
          </span>
        </h1>
      </header>

      {/* Filter tabs: sharp underline treatment (same as the public gallery) */}
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", borderBottom: "1px solid var(--border)", marginBottom: "1.5rem" }}
      >
        {FILTER_TABS.map((tab) => {
          const active = tab.status === activeStatus;
          return (
            <Link
              key={tab.label}
              href={tab.status ? `/admin/applications?status=${tab.status}` : "/admin/applications"}
              className="heading"
              style={{
                borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: "-1px",
                padding: "0.65rem 1.1rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: active ? "var(--text-primary)" : "var(--text-muted)",
                textDecoration: "none",
                transition: "color 0.2s, border-color 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <ApplicationsTable applications={applications} />
    </>
  );
}
