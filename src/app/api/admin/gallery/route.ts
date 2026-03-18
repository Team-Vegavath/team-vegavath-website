import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGalleryItems, createGalleryItem, deleteGalleryItem } from "@/lib/services/gallery";

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await getGalleryItems(200);
    return NextResponse.json(items);
  } catch (error) {
    console.error("[GET /api/admin/gallery]", error);
    return NextResponse.json({ error: "Failed to fetch gallery" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const item = await createGalleryItem(body);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/gallery]", error);
    return NextResponse.json({ error: "Failed to create gallery item" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await deleteGalleryItem(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/gallery]", error);
    return NextResponse.json({ error: "Failed to delete gallery item" }, { status: 500 });
  }
}