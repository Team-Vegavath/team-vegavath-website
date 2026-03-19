import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getMembers } from "@/lib/services/team";
import type { TeamMember } from "@/types/member";

export const metadata: Metadata = {
  title: "Team | Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  const members = await getMembers().catch(() => [] as TeamMember[]);

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Link
          href="/admin/dashboard"
          className="w-fit text-sm text-zinc-400 transition-colors hover:text-zinc-200"
        >
          ← Dashboard
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight">Manage Team</h1>
          <button
            type="button"
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-300"
          >
            Add New Member
          </button>
        </div>

        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800 text-sm">
              <thead className="bg-zinc-950/60 text-left text-xs uppercase tracking-[0.12em] text-zinc-400">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Tier</th>
                  <th className="px-5 py-3">Domain</th>
                  <th className="px-5 py-3">Active</th>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {members.length > 0 ? (
                  members.map((member) => (
                    <tr key={member.id} className="text-zinc-200">
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-zinc-100">
                        {member.name}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-zinc-300">{member.role}</td>
                      <td className="whitespace-nowrap px-5 py-3 uppercase text-zinc-300">
                        {member.tier}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-zinc-300">
                        {member.domain ?? "-"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-zinc-300">
                        {member.is_active ? "Yes" : "No"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-zinc-300">
                        {member.display_order}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-200"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-200"
                          >
                            Toggle
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-zinc-400">
                      No members yet.
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
