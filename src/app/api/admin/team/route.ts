import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMembers, createMember, updateMember, toggleMemberActive, deleteMember } from "@/lib/services/team";

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const members = await getMembers();
    return NextResponse.json(members);
  } catch (error) {
    console.error("[GET /api/admin/team]", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const member = await createMember(body);
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/team]", error);
    return NextResponse.json({ error: "Failed to create member" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, ...input } = body;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // Active-only payload (the table's inline toggle) takes the cheap path.
    // Any other payload goes through updateMember, which now writes is_active
    // too -- previously it was stripped here and never persisted from the form.
    if (Object.keys(input).length === 1 && typeof input.is_active === "boolean") {
      await toggleMemberActive(id as string, input.is_active);
      return NextResponse.json({ success: true });
    }

    const member = await updateMember(id as string, input);
    return NextResponse.json(member);
  } catch (error) {
    console.error("[PATCH /api/admin/team]", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await deleteMember(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/team]", error);
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 });
  }
}