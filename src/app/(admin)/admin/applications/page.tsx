import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import ApplicationsTable from "@/components/admin/ApplicationsTable";
import { auth } from "@/lib/auth";
import { getApplications } from "@/lib/services/applications";
import type { Application, ApplicationStatus, InterviewGroup } from "@/types/settings";
import { INTERVIEW_GROUPS } from "@/types/settings";

export const metadata: Metadata = {
  title: "Applications",
};

export const dynamic = "force-dynamic";

// Tab set = the S19 pipeline. Group tabs (S28) filter by interview_group
// instead of status. Legacy 'accepted'/'reviewed' tabs removed in S32 -
// old rows stay reachable through ALL.
const FILTER_TABS: {
  label: string;
  status: ApplicationStatus | null;
  group?: InterviewGroup;
}[] = [
  { label: "ALL", status: null },
  { label: "PENDING", status: "pending" },
  { label: "SHORTLISTED", status: "shortlisted" },
  { label: "INTERVIEW", status: "interview" },
  { label: "SELECTED", status: "selected" },
  { label: "REJECTED", status: "rejected" },
  ...INTERVIEW_GROUPS.map((g) => ({
    label: `INTERVIEW ${g}`,
    status: null,
    group: g,
  })),
];

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; group?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  const { status: statusParam, group: groupParam } = await searchParams;
  const activeGroup =
    INTERVIEW_GROUPS.find((g) => g === groupParam) ?? null;
  const activeStatus = activeGroup
    ? null
    : FILTER_TABS.find((tab) => tab.status === statusParam)?.status ?? null;

  const applications = await getApplications({
    status: activeStatus ?? undefined,
    interviewGroup: activeGroup ?? undefined,
    limit: 200,
  }).catch(() => [] as Application[]);

  return (
    <>
      <header className="admin-page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <h1 className="admin-page-title">
          Applications{" "}
          <span
            className="mono"
            style={{ fontSize: "0.8rem", letterSpacing: "0.12em", color: "var(--text-muted)", fontWeight: 400 }}
          >
            {applications.length}
          </span>
        </h1>
        {/* Plain <a>: must be a real navigation so the browser downloads the file. */}
        <a
          href={`/api/admin/applications/export${activeStatus ? `?status=${activeStatus}` : ""}`}
          download
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.72rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
            padding: "6px 14px",
            textDecoration: "none",
          }}
        >
          EXPORT CSV
        </a>
      </header>

      {/* Filter tabs: sharp underline treatment (same as the public gallery) */}
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", borderBottom: "1px solid var(--border)", marginBottom: "1.5rem" }}
      >
        {FILTER_TABS.map((tab) => {
          const active = tab.group
            ? tab.group === activeGroup
            : !activeGroup && tab.status === activeStatus;
          const href = tab.group
            ? `/admin/applications?group=${tab.group}`
            : tab.status
              ? `/admin/applications?status=${tab.status}`
              : "/admin/applications";
          return (
            <Link
              key={tab.label}
              href={href}
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

      <p
        className="mono"
        style={{ fontSize: "0.68rem", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "1.5rem" }}
      >
        Use SELECTED/REJECTED for new decisions. ACCEPTED and REVIEWED are legacy statuses.
      </p>

      <ApplicationsTable
        applications={applications}
        showPanelAssign={activeStatus === "interview" && !activeGroup}
      />
    </>
  );
}
