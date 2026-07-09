import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getApplications } from "@/lib/services/applications";
import { getAllSettings } from "@/lib/services/settings";
import SettingsForm from "@/components/admin/SettingsForm";
import type { Application, SiteSettings } from "@/types/settings";

export const metadata: Metadata = {
  title: "Settings | Admin",
};

export const dynamic = "force-dynamic";

const DEFAULT_SETTINGS: SiteSettings = {
  recruitment_open: false,
  maintenance_mode: false,
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

export default async function AdminSettingsPage() {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  let settings: SiteSettings = DEFAULT_SETTINGS;
  let applications: Application[] = [];

  try {
    [settings, applications] = await Promise.all([
      getAllSettings(),
      getApplications(50),
    ]);
  } catch {
    settings = DEFAULT_SETTINGS;
    applications = [];
  }

  return (
    <>
      <header className="admin-page-header">
        <h1 className="admin-page-title">Settings</h1>
      </header>

      <div style={{ maxWidth: "52rem", marginBottom: "2rem" }}>
        <SettingsForm settings={settings} />
      </div>

      <section className="admin-table-wrap">
        <div style={{ padding: "1rem 1rem 0.75rem", borderBottom: "1px solid var(--border-strong)" }}>
          <h2 className="heading" style={{ fontSize: "0.9rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-primary)" }}>
            Recent Applications
          </h2>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Domain</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {applications.length > 0 ? (
              applications.map((application) => (
                <tr key={application.id}>
                  <td style={{ whiteSpace: "nowrap", fontWeight: 500 }}>{application.name}</td>
                  <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{application.email}</td>
                  <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{application.domain_interest}</td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap", textTransform: "uppercase" }}>
                    {application.status}
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
