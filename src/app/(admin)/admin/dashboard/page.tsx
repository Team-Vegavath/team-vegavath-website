import type { Metadata } from "next";
import { redirect } from "next/navigation";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import { auth } from "@/lib/auth";
import { getRecentLogins } from "@/lib/services/admin";
import type { AdminLoginEntry } from "@/lib/services/admin";
import { getApplications } from "@/lib/services/applications";
import { getEvents } from "@/lib/services/events";
import { getGalleryItemsLimited } from "@/lib/services/gallery";
import { getAllSettings } from "@/lib/services/settings";
import { getSponsors } from "@/lib/services/sponsors";
import { getMembers } from "@/lib/services/team";
import type { Application, SiteSettings } from "@/types/settings";
import type { Event } from "@/types/event";
import type { GalleryItem } from "@/types/gallery";
import type { Sponsor } from "@/types/sponsor";
import type { TeamMember } from "@/types/member";

export const metadata: Metadata = {
  title: "Dashboard",
};

export const dynamic = "force-dynamic";

const DEFAULT_SETTINGS: SiteSettings = {
  recruitment_open: false,
  maintenance_mode: false,
  f1_enabled: false,
  maintenance_message: "",
  contact_email: "",
  contact_phone: "",
  contact_address: "",
  instagram_url: "",
  linkedin_url: "",
  github_url: "",
};

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(date);
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  const [settings, applications, events, members, galleryItems, sponsors, logins] = await Promise.all([
    getAllSettings().catch(() => DEFAULT_SETTINGS),
    getApplications({ limit: 10 }).catch(() => [] as Application[]),
    getEvents({ limit: 100 }).catch(() => [] as Event[]),
    getMembers().catch(() => [] as TeamMember[]),
    getGalleryItemsLimited(200).catch(() => [] as GalleryItem[]),
    getSponsors().catch(() => [] as Sponsor[]),
    getRecentLogins(10).catch(() => [] as AdminLoginEntry[]),
  ]);

  const activeSponsors = sponsors.filter((sponsor) => sponsor.is_active).length;

  const stats = [
    { label: "Events", value: events.length },
    { label: "Team Members", value: members.length },
    { label: "Gallery Items", value: galleryItems.length },
    { label: "Active Sponsors", value: activeSponsors },
  ] as const;

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        action={
          <p className="mono" style={{ fontSize: "0.68rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
            Recruitment{" "}
            <span style={{ color: settings.recruitment_open ? "var(--success)" : "var(--error)" }}>
              {settings.recruitment_open ? "OPEN" : "CLOSED"}
            </span>
          </p>
        }
      />

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 11rem), 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {stats.map(({ label, value }) => (
          <AdminStatCard key={label} label={label} value={value} accent={label === "Events"} />
        ))}
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <span className="admin-section-label">RECENT LOGINS</span>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Status</th>
                <th>IP</th>
                <th>Device</th>
              </tr>
            </thead>
            <tbody>
              {logins.length > 0 ? (
                logins.map((login) => (
                  <tr key={login.id}>
                    <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>
                      {formatDateTime(login.attempted_at)}
                    </td>
                    <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: "0.45rem",
                          height: "0.45rem",
                          marginRight: "0.5rem",
                          background: login.success ? "var(--success)" : "var(--error)",
                        }}
                      />
                      <span style={{ color: login.success ? "var(--success)" : "var(--error)" }}>
                        {login.success ? "SUCCESS" : "FAILED"}
                      </span>
                    </td>
                    <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>
                      {login.ip_address ?? "-"}
                    </td>
                    <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>
                      {login.device_hint ?? "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="admin-empty">
                    NO LOGIN HISTORY YET
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-table-wrap">
        <div style={{ padding: "1rem 1rem 0.75rem", borderBottom: "1px solid var(--border-strong)" }}>
          <h2 className="heading" style={{ fontSize: "0.9rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-primary)" }}>
            Recent Applications
          </h2>
          <p className="mono" style={{ marginTop: "0.3rem", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            Latest 10 submissions from the join form
          </p>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Domain</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {applications.length > 0 ? (
              applications.map((application) => (
                <tr key={application.id}>
                  <td className="admin-td-primary" style={{ whiteSpace: "nowrap", fontWeight: 500 }}>{application.name}</td>
                  <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{application.email}</td>
                  <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{application.domain_interest}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span className={`status-badge status-${application.status}`}>
                      {application.status}
                    </span>
                  </td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>
                    {formatDate(application.submitted_at)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="admin-empty">
                  No applications yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
