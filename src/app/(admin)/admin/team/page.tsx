import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import MemberForm from "@/components/admin/MemberForm";
import { auth } from "@/lib/auth";
import { getMembers } from "@/lib/services/team";
import type { TeamMember } from "@/types/member";

export const metadata: Metadata = {
  title: "Team | Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  const resolvedSearchParams = await searchParams;
  const members = await getMembers().catch(() => [] as TeamMember[]);

  if (resolvedSearchParams.new === "true") {
    return (
      <main style={{ minHeight: "100vh", background: "#09090b", color: "#EBEBEB", padding: "6rem 2rem 4rem", boxSizing: "border-box" }}>
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <Link
            href="/admin/team"
            style={{ display: "inline-flex", alignItems: "center", borderRadius: "9999px", border: "1.5px solid #EF5D08", padding: "0.5rem 1.25rem", fontSize: "0.85rem", fontWeight: 600, color: "#EF5D08", textDecoration: "none", transition: "all 0.2s", width: "fit-content" }}
          >
            ← Back to team list
          </Link>

          <h1 className="text-3xl font-extrabold tracking-tight text-[#EBEBEB]">Add New Member</h1>

          <MemberForm mode="create" />
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#09090b", color: "#EBEBEB", padding: "6rem 2rem 4rem", boxSizing: "border-box" }}>
      <div style={{ margin: "0 auto", width: "100%", maxWidth: "72rem", display: "flex", flexDirection: "column", gap: "1.5rem", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 900, color: "#EBEBEB" }}>Manage Team</h1>
          <Link
            href="/admin/team?new=true"
            className="w-fit rounded-lg bg-[#EF5D08] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#d84f00]"
          >
            Add New Member
          </Link>
        </div>

        <section className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#2a2a2a] text-sm">
              <thead className="bg-[#121212] text-left text-xs uppercase tracking-[0.12em] text-zinc-400">
                <tr>
                  <th className="px-5 py-3">Photo</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Tier</th>
                  <th className="px-5 py-3">Domain</th>
                  <th className="px-5 py-3">Active</th>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a]">
                {members.length > 0 ? (
                  members.map((member) => (
                    <tr key={member.id} className="text-zinc-200">
                      <td className="whitespace-nowrap px-5 py-3">
                        {member.photo_url ? (
                          <img
                            src={member.photo_url}
                            alt={member.name}
                            className="h-10 w-10 rounded-md object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-[#2a2a2a]" />
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-zinc-100">
                        {member.name}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-zinc-300">{member.role}</td>
                      <td className="whitespace-nowrap px-5 py-3 uppercase text-zinc-300">{member.tier}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-zinc-300">
                        {member.domain ?? "-"}
                      </td>
                      <td
                        className={`whitespace-nowrap px-5 py-3 font-medium ${
                          member.is_active ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {member.is_active ? "Yes" : "No"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-zinc-300">
                        {member.display_order}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <Link
                          href={`/admin/team/${member.id}/edit`}
                          className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
                        >
                            Edit
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-zinc-400">
                      No members yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <Link
          href="/admin/dashboard"
          style={{ display: "inline-flex", alignItems: "center", borderRadius: "9999px", border: "1px solid #3f3f46", padding: "0.4rem 1rem", fontSize: "0.8rem", color: "#a1a1aa", textDecoration: "none", transition: "all 0.2s", width: "fit-content" }}
        >
          ← Back to dashboard
        </Link>
      </div>
    </main>
  );
}
