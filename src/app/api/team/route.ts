import { NextRequest, NextResponse } from "next/server";
import { getMembers, getMembersByTier } from "@/lib/services/team";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tier = searchParams.get("tier") as "core" | "crew" | "legacy" | null;

    if (tier && ["core", "crew", "legacy"].includes(tier)) {
      const members = await getMembersByTier(tier);
      return NextResponse.json(members);
    }

    const members = await getMembers();
    return NextResponse.json(members);
  } catch (error) {
    console.error("[GET /api/team]", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}