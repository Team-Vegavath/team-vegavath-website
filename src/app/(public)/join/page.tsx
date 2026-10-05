import type { Metadata } from "next";
import { getAllSettings } from "@/lib/services/settings";
import JoinClient from "@/components/join/JoinClient";
import { JOIN_DOMAINS } from "@/lib/utils/joinQuestions";

export const dynamic = "force-dynamic";

// S82B: from the one ordered domain list, so this cannot drift from the form.
const domainLabels = JOIN_DOMAINS.map((d) => d.label);

export const metadata: Metadata = {
  title: "Join Us",
  description: `Apply to join Team Vegavath at PESU ECC. We recruit across ${domainLabels.slice(0, -1).join(", ")} and ${domainLabels.at(-1)}.`,
  alternates: { canonical: "/join" },
  openGraph: {
    title: "Join Team Vegavath",
    description:
      "Apply to join PESU ECC's motorsport and innovation club. Recruitment opens annually.",
  },
};

export default async function JoinPage() {
  let recruitmentOpen = false;

  try {
    const settings = await getAllSettings();
    recruitmentOpen = settings?.recruitment_open ?? false;
  } catch {
    recruitmentOpen = false;
  }

  return <JoinClient recruitmentOpen={recruitmentOpen} />;
}
