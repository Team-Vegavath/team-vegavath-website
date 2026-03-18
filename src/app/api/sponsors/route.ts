import { NextResponse } from "next/server";
import { getActiveSponsors } from "@/lib/services/sponsors";

export const revalidate = 120;

export async function GET() {
  try {
    const sponsors = await getActiveSponsors();
    return NextResponse.json(sponsors);
  } catch (error) {
    console.error("[GET /api/sponsors]", error);
    return NextResponse.json(
      { error: "Failed to fetch sponsors" },
      { status: 500 }
    );
  }
}