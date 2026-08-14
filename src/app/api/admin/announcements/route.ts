import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  toggleAnnouncementActive,
  deleteAnnouncement,
} from "@/lib/services/announcements";

// Mirrors /api/admin/sponsors: isAdmin on every method, plus the viewer guard
// on the three mutating ones. Both layers stay even though middleware already
// gates /admin.
export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const announcements = await getAnnouncements();
    return NextResponse.json(announcements);
  } catch (error) {
    console.error("[GET /api/admin/announcements]", error);
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 });
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
    if (!body?.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const announcement = await createAnnouncement(body);
    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/announcements]", error);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
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
    const { id, is_active, ...input } = body;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // Toggle-only call (the table's ACTIVE switch) takes the cheap path.
    if (typeof is_active === "boolean" && Object.keys(input).length === 0) {
      await toggleAnnouncementActive(id as string, is_active);
      return NextResponse.json({ success: true });
    }

    // The form sends explicit nulls to clear an image or a CTA, so the null has
    // to survive all the way into updateAnnouncement. Nothing here strips it.
    const announcement = await updateAnnouncement(id as string, {
      ...input,
      ...(typeof is_active === "boolean" ? { is_active } : {}),
    });
    return NextResponse.json(announcement);
  } catch (error) {
    console.error("[PATCH /api/admin/announcements]", error);
    return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 });
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

    await deleteAnnouncement(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/announcements]", error);
    return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 });
  }
}
