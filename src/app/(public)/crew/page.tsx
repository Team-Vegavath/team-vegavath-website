import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getMembers } from "@/lib/services/team";
import type { TeamMember } from "@/types/member";

export const metadata: Metadata = {
  title: "The Crew | Team Vegavath",
};

export const revalidate = 120;

type MemberSectionProps = {
  title: string;
  members: TeamMember[];
};

function MemberSection({ title, members }: MemberSectionProps) {
  if (members.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-wider text-[#EBEBEB]">{title}</h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <article
            key={member.id}
            className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a]"
          >
            <div className="relative aspect-square w-full bg-[#2a2a2a]">
              {member.photo_url ? (
                <Image
                  src={member.photo_url}
                  alt={member.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : (
                <div className="h-full w-full bg-[#2a2a2a]" />
              )}
            </div>

            <div className="space-y-2 p-4">
              <h3 className="text-lg font-bold text-[#EBEBEB]">{member.name}</h3>
              <p className="text-sm font-medium text-[#EF5D08]">{member.role}</p>
              {member.quote ? (
                <p className="text-sm leading-relaxed text-[#9a9a9a]">{member.quote}</p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default async function CrewPage() {
  let members: TeamMember[] = [];

  try {
    members = await getMembers();
  } catch {
    members = [];
  }

  const coreMembers = members.filter((member) => member.tier === "core");
  const crewMembers = members.filter((member) => member.tier === "crew");
  const legacyMembers = members.filter((member) => member.tier === "legacy");

  return (
    <main className="mx-auto w-full max-w-7xl space-y-14 bg-[#121212] px-4 py-12 text-[#EBEBEB] sm:px-6 lg:px-8 lg:py-16">
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold tracking-widest text-[#EBEBEB] sm:text-4xl">
          MEET THE CREW
        </h1>
        <p className="max-w-2xl text-base text-[#9a9a9a] sm:text-lg">
          Our diverse team of passionate engineers, designers, and innovators
        </p>
      </header>

      <MemberSection title="CORE" members={coreMembers} />
      <MemberSection title="CREW" members={crewMembers} />
      <MemberSection title="LEGACY CREW" members={legacyMembers} />

      <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-[#EBEBEB]">WANT TO JOIN OUR CREW?</h2>
          <p className="text-[#9a9a9a]">{"We're always looking for passionate individuals"}</p>
        </div>

        <Link
          href="/join"
          className="inline-flex items-center rounded-md bg-[#EF5D08] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#EF5D08]"
        >
          Apply Now
        </Link>
      </section>
    </main>
  );
}