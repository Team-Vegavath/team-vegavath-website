import { NextRequest, NextResponse } from "next/server";
import { createApplication } from "@/lib/services/applications";
import { getSetting } from "@/lib/services/settings";
import { isValidEmail, isValidUrl } from "@/lib/utils";
import { normalisePhone } from "@/lib/utils/phone";
import { normaliseSrnPrn } from "@/lib/utils/srn";
import type { ApplicationDomain } from "@/types/settings";

// FY26 domains ∙ must stay in sync with JoinClient DOMAINS and the CHECK
// constraints in migrations/004_application_new_fields.sql.
const VALID_DOMAINS = [
  "Coding",
  "Automotives",
  "Sponsorship",
  "Robotics",
  "Operations",
  "Social Media",
] as const;

const VALID_SEMESTERS = ["1", "3", "5"] as const;

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;

    // Honeypot check ∙ bots fill this, humans don't
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
    const domain_interest_2 = optionalString(body.domain_interest_2);
    const domain_interest_3 = optionalString(body.domain_interest_3);
    const mobile_raw = optionalString(body.mobile_number);
    // normalise when present (strips +91 / spaces); null stays null (optional field)
    const mobile_number = mobile_raw === null ? null : normalisePhone(mobile_raw);
    const srn_prn_raw = optionalString(body.srn_prn);
    // The /join toggle picks SRN or PRN for the student's benefit; the API takes
    // either, since both are valid identifiers for the same applicant.
    const srn_prn = srn_prn_raw === null ? null : normaliseSrnPrn(srn_prn_raw);
    const semester = optionalString(body.semester);
    const why_join = optionalString(body.why_join);
    const value_addition = optionalString(body.value_addition);
    const domain_experience = optionalString(body.domain_experience);
    const design_portfolio_url = optionalString(body.design_portfolio_url);

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

    if (!VALID_DOMAINS.includes(domain_interest as ApplicationDomain)) {
      return NextResponse.json(
        { error: "Please select a valid domain" },
        { status: 400 }
      );
    }

    for (const extra of [domain_interest_2, domain_interest_3]) {
      if (extra !== null && !VALID_DOMAINS.includes(extra as ApplicationDomain)) {
        return NextResponse.json(
          { error: "Please select a valid domain" },
          { status: 400 }
        );
      }
    }

    // mobile_raw present but normalisePhone rejected it → not 10 digits
    if (mobile_raw !== null && mobile_number === null) {
      return NextResponse.json(
        { error: "Mobile number must be 10 digits (optionally prefixed with +91)" },
        { status: 400 }
      );
    }

    // srn_prn_raw present but normaliseSrnPrn rejected it → wrong format
    if (srn_prn_raw !== null && srn_prn === null) {
      return NextResponse.json(
        { error: "SRN / PRN must look like PES2UG24CS019 or PES2202400960" },
        { status: 400 }
      );
    }

    if (semester !== null && !VALID_SEMESTERS.includes(semester as "1" | "3" | "5")) {
      return NextResponse.json(
        { error: "Semester must be 1, 3, or 5" },
        { status: 400 }
      );
    }

    if (design_portfolio_url !== null && !isValidUrl(design_portfolio_url)) {
      return NextResponse.json(
        { error: "Portfolio link must start with https://" },
        { status: 400 }
      );
    }

    const application = await createApplication({
      name,
      email,
      domain_interest: domain_interest as ApplicationDomain,
      domain_interest_2,
      domain_interest_3,
      portfolio_url: null,
      mobile_number,
      srn_prn,
      semester: semester as "1" | "3" | "5" | null,
      why_join,
      value_addition,
      domain_experience,
      design_portfolio_url,
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
