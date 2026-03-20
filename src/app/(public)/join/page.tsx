import Link from "next/link";
import type { Metadata } from "next";

import { getAllSettings } from "@/lib/services/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Join Us | Team Vegavath",
};

export default async function JoinPage() {
  let settings = null;

  try {
    settings = await getAllSettings();
  } catch {
    settings = null;
  }

  if (!settings || !settings.recruitment_open) {
    return (
      <main className="min-h-screen bg-[#1a1a1a] px-4 py-16 text-[#EBEBEB] sm:px-6 lg:px-8">
        <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center">
          <h1 className="text-3xl font-black tracking-wide sm:text-4xl">
            JOIN THE RACE
          </h1>

          <div className="w-full rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a]/80 p-8 shadow-xl shadow-black/20">
            <div className="mb-4 text-5xl leading-none" aria-hidden="true">
              🚫
            </div>
            <p className="text-xl font-bold text-[#EF5D08]">RECRUITMENT CLOSED</p>
            <p className="mx-auto mt-3 max-w-xl text-sm text-[#9a9a9a] sm:text-base">
              We are not accepting applications right now. Please check back later
              or follow our announcements for updates.
            </p>

            <Link
              href="/"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#EF5D08] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#F29C04]"
            >
              Back to Home
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#1a1a1a] px-4 py-16 text-[#EBEBEB] sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-3xl">
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a]/80 p-8 text-center text-lg shadow-xl shadow-black/20">
          Recruitment form — coming soon
        </div>
      </section>
    </main>
  );
}
