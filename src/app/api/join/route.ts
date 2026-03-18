import { NextRequest, NextResponse } from "next/server";
import { createApplication } from "@/lib/services/applications";
import { getSetting } from "@/lib/services/settings";
import { isValidEmail, isValidUrl } from "@/lib/utils";

const VALID_DOMAINS = ["Automotive", "Robotics", "Design", "Media", "Marketing"] as const;
type Domain = typeof VALID_DOMAINS[number];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;

    // Honeypot check — bots fill this, humans don't
    if (body.website) {
      return NextResponse.json({ success: true });
    }

    // Check recruitment is open
    const recruitmentOpen = await getSetting("recruitment_open");
    if (recruitmentOpen !== "true") {
      return NextResponse.json(
        { error: "Recruitment is currently closed" },
        { status: 403 }
      );
    }

    // Validate fields
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const domain_interest = typeof body.domain_interest === "string" ? body.domain_interest : "";
    const portfolio_url = typeof body.portfolio_url === "string" ? body.portfolio_url.trim() : null;

    if (!name || name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { error: "Name must be between 2 and 100 characters" },
        { status: 400 }
      );
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      );
    }

    if (!VALID_DOMAINS.includes(domain_interest as Domain)) {
      return NextResponse.json(
        { error: "Please select a valid domain" },
        { status: 400 }
      );
    }

    if (portfolio_url && !isValidUrl(portfolio_url)) {
      return NextResponse.json(
        { error: "Portfolio URL must start with https://" },
        { status: 400 }
      );
    }

    const application = await createApplication({
      name,
      email,
      domain_interest: domain_interest as Domain,
      portfolio_url: portfolio_url ?? null,
    });

    return NextResponse.json({ success: true, id: application.id });
  } catch (error) {
    console.error("[POST /api/join]", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}