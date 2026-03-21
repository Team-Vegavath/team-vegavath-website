import type { Metadata } from "next";
import { getAllSettings } from "@/lib/services/settings";
import JoinClient from "@/components/join/JoinClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Join Us | Team Vegavath",
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
