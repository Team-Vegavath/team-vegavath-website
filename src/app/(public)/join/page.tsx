import type { Metadata } from "next";
import { getAllSettings } from "@/lib/services/settings";
import JoinClient from "@/components/join/JoinClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Join Us",
  description:
    "Apply to join Team Vegavath at PESU ECC. We recruit across Automotives, Robotics, Coding, Operations, Sponsorship and Social Media.",
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
