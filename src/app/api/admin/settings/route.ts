import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllSettings, setSetting } from "@/lib/services/settings";
import { getApplications, updateApplicationStatus } from "@/lib/services/applications";
import type { Application } from "@/types/settings";

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [settings, applications] = await Promise.all([
      getAllSettings(),
      getApplications(50),
    ]);
    return NextResponse.json({ settings, applications });
  } catch (error) {
    console.error("[GET /api/admin/settings]", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json() as Record<string, unknown>;

    // Handle application status update
    if (body.applicationId && body.status) {
      await updateApplicationStatus(
        body.applicationId as string,
        body.status as Application["status"]
      );
      return NextResponse.json({ success: true });
    }

    // Handle settings update — iterate key/value pairs
    const validKeys = [
      "recruitment_open", "maintenance_mode", "maintenance_message",
      "contact_email", "contact_phone", "contact_address",
      "instagram_url", "linkedin_url", "github_url",
    ];

    for (const key of validKeys) {
      if (key in body && body[key] !== undefined) {
        await setSetting(key, String(body[key]));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/admin/settings]", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}