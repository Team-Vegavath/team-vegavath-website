import Image from "next/image";
import type { Metadata } from "next";

import { getActiveSponsors } from "@/lib/services/sponsors";

export const metadata: Metadata = {
  title: "Sponsors | Team Vegavath",
};

export const revalidate = 120;

export default async function SponsorsPage() {
  let sponsors = [] as Awaited<ReturnType<typeof getActiveSponsors>>;

  try {
    sponsors = await getActiveSponsors();
  } catch {
    sponsors = [];
  }

  return (
    <main className="mx-auto w-full max-w-7xl bg-[#121212] px-4 py-12 text-[#EBEBEB] sm:px-6 lg:px-8">
      <section>
        <h1 className="text-3xl font-bold tracking-tight text-[#EBEBEB] sm:text-4xl">
          Sponsors &amp; Community
        </h1>

        {sponsors.length === 0 ? (
          <p className="mt-8 text-base text-[#9a9a9a]">No sponsors to display yet.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {sponsors.map((sponsor) => (
              <article
                key={sponsor.id}
                className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-5 text-center shadow-sm"
              >
                <div className="flex h-[60px] items-center justify-center">
                  <Image
                    src={sponsor.logo_url}
                    alt={sponsor.name}
                    width={120}
                    height={60}
                    className="h-[60px] w-[120px] object-contain"
                  />
                </div>
                <p className="mt-4 text-sm font-semibold text-[#EBEBEB]">{sponsor.name}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-14 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-8 sm:p-10">
        <h2 className="text-2xl font-bold text-[#EBEBEB]">
          Interested in sponsoring Vegavath?
        </h2>
        <a
          href="mailto:vegavath@pes.edu"
          className="mt-5 inline-flex items-center rounded-lg bg-[#EF5D08] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#EF5D08]"
        >
          Become a Sponsor
        </a>
      </section>
    </main>
  );
}
