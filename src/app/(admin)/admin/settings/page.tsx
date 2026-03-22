import type { Metadata } from "next";
import Link from "next/link";
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
    <main style={{ minHeight: "100vh", background: "#09090b", color: "white", padding: "6rem 2rem 4rem", boxSizing: "border-box" }}>
      <div style={{ margin: "0 auto", width: "100%", maxWidth: "72rem", display: "flex", flexDirection: "column", gap: "1.5rem", boxSizing: "border-box" }}>
        <Link
          href="/admin/dashboard"
          style={{ display: "inline-flex", alignItems: "center", borderRadius: "9999px", border: "1.5px solid #EF5D08", padding: "0.5rem 1.25rem", fontSize: "0.85rem", fontWeight: 600, color: "#EF5D08", textDecoration: "none", transition: "all 0.2s", width: "fit-content" }}
        >
          ← Dashboard
        </Link>

        <h1 className="text-3xl font-extrabold tracking-tight">Site Settings</h1>

        <SettingsForm settings={settings} />

        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 px-5 py-4">
            <h2 className="text-lg font-bold text-zinc-100">Recent Applications</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800 text-sm">
              <thead className="bg-zinc-950/60 text-left text-xs uppercase tracking-[0.12em] text-zinc-400">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Domain</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {applications.length > 0 ? (
                  applications.map((application) => (
                    <tr key={application.id} className="text-zinc-200">
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-zinc-100">
                        {application.name}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-zinc-300">
                        {application.email}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-zinc-300">
                        {application.domain_interest}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-zinc-300">
                        {application.status}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-zinc-300">
                        {formatDate(application.submitted_at)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-zinc-400">
                      No applications yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
