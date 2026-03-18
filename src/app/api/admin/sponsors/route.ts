import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSponsors, createSponsor, updateSponsor, toggleSponsorActive } from "@/lib/services/sponsors";

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sponsors = await getSponsors();
    return NextResponse.json(sponsors);
  } catch (error) {
    console.error("[GET /api/admin/sponsors]", error);
    return NextResponse.json({ error: "Failed to fetch sponsors" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const sponsor = await createSponsor(body);
    return NextResponse.json(sponsor, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/sponsors]", error);
    return NextResponse.json({ error: "Failed to create sponsor" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, is_active, ...input } = body;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    if (typeof is_active === "boolean" && Object.keys(input).length === 0) {
      await toggleSponsorActive(id as string, is_active);
      return NextResponse.json({ success: true });
    }

    const sponsor = await updateSponsor(id as string, input);
    return NextResponse.json(sponsor);
  } catch (error) {
    console.error("[PATCH /api/admin/sponsors]", error);
    return NextResponse.json({ error: "Failed to update sponsor" }, { status: 500 });
  }
}