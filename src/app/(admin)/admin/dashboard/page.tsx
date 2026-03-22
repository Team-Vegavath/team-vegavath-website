import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import SignOutButton from "@/components/admin/SignOutButton";
import { auth } from "@/lib/auth";
import { getApplications } from "@/lib/services/applications";
import { getEvents } from "@/lib/services/events";
import { getAllSettings } from "@/lib/services/settings";
import { getMembers } from "@/lib/services/team";
import type { Application, SiteSettings } from "@/types/settings";
import type { Event } from "@/types/event";
import type { TeamMember } from "@/types/member";

export const metadata: Metadata = {
  title: "Dashboard | Team Vegavath Admin",
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

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  const [settings, applications, events, members] = await Promise.all([
    getAllSettings().catch(() => DEFAULT_SETTINGS),
    getApplications(10).catch(() => [] as Application[]),
    getEvents({ limit: 5 }).catch(() => [] as Event[]),
    getMembers().catch(() => [] as TeamMember[]),
  ]);

  const pendingApplications = applications.filter(
    (application) => application.status === "pending"
  ).length;

  return (
    <main style={{ minHeight: "100vh", background: "#09090b", color: "white" }}>
      <div style={{ margin: "0 auto", width: "100%", maxWidth: "72rem", display: "flex", flexDirection: "column", gap: "2rem", boxSizing: "border-box", padding: "6rem 2rem 4rem" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", paddingBottom: "1rem", borderBottom: "1px solid #27272a" }}>
          <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 900, color: "#EBEBEB" }}>Admin Dashboard</h1>
          <SignOutButton />
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))", gap: "1rem" }}>
          <article style={{ borderRadius: "0.75rem", border: "1px solid #27272a", background: "#18181b", padding: "1.25rem" }}>
            <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#71717a" }}>Total Events</p>
            <p style={{ marginTop: "0.5rem", fontSize: "2rem", fontWeight: 700, color: "#EBEBEB" }}>{events.length}</p>
          </article>
          <article style={{ borderRadius: "0.75rem", border: "1px solid #27272a", background: "#18181b", padding: "1.25rem" }}>
            <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#71717a" }}>Total Members</p>
            <p style={{ marginTop: "0.5rem", fontSize: "2rem", fontWeight: 700, color: "#EBEBEB" }}>{members.length}</p>
          </article>
          <article style={{ borderRadius: "0.75rem", border: "1px solid #27272a", background: "#18181b", padding: "1.25rem" }}>
            <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#71717a" }}>Pending Applications</p>
            <p style={{ marginTop: "0.5rem", fontSize: "2rem", fontWeight: 700, color: "#EBEBEB" }}>{pendingApplications}</p>
          </article>
          <article style={{ borderRadius: "0.75rem", border: "1px solid #27272a", background: "#18181b", padding: "1.25rem" }}>
            <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#71717a" }}>Recruitment Status</p>
            <p style={{ marginTop: "0.5rem", fontSize: "2rem", fontWeight: 700, color: settings.recruitment_open ? "#4ade80" : "#f87171" }}>
              {settings.recruitment_open ? "OPEN" : "CLOSED"}
            </p>
          </article>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 14rem), 1fr))", gap: "1rem" }}>
          {(
            [
              { href: "/admin/events", label: "Manage Events", emoji: "📅" },
              { href: "/admin/team", label: "Manage Team", emoji: "👥" },
              { href: "/admin/gallery", label: "Manage Gallery", emoji: "🖼️" },
              { href: "/admin/sponsors", label: "Manage Sponsors", emoji: "🤝" },
              { href: "/admin/settings", label: "Settings", emoji: "⚙️" },
            ] as const
          ).map(({ href, label, emoji }) => (
            <Link
              key={href}
              href={href}
              style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderRadius: "0.75rem", border: "1px solid #27272a", background: "#18181b", padding: "1.25rem 1.5rem", fontSize: "0.95rem", fontWeight: 600, color: "#EBEBEB", textDecoration: "none", transition: "border-color 0.2s" }}
              className="hover:border-[#EF5D08]"
            >
              <span style={{ fontSize: "1.25rem" }}>{emoji}</span>
              {label}
            </Link>
          ))}
        </section>

        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 px-5 py-4">
            <h2 className="text-lg font-bold text-zinc-100">Recent Applications</h2>
            <p className="mt-1 text-sm text-zinc-400">Latest 10 submissions from join form</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800 text-sm">
              <thead className="bg-zinc-950/60 text-left text-xs uppercase tracking-[0.12em] text-zinc-400">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Domain</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Submitted</th>
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
                      <td className="whitespace-nowrap px-5 py-3">{application.domain_interest}</td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <span className="inline-flex rounded-full border border-zinc-700 px-2 py-1 text-xs uppercase tracking-wide text-zinc-200">
                          {application.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-zinc-300">
                        {formatDate(application.submitted_at)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-zinc-400">
                      No applications found.
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
