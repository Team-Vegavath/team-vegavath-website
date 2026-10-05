import { NextRequest, NextResponse } from "next/server";
import { createApplication } from "@/lib/services/applications";
import { getSetting } from "@/lib/services/settings";
import { isValidEmail } from "@/lib/utils";
import { COURSES, DOMAINS, SHORT_ANSWER_MAX, parseJoinAnswers } from "@/lib/utils/joinQuestions";
import { normalisePhone } from "@/lib/utils/phone";
import { normaliseSrnPrn } from "@/lib/utils/srn";
import type { ApplicationDomain } from "@/types/settings";

// FY26 domains ∙ S81: one list shared with JoinClient (lib/utils/joinQuestions);
// it must still match the CHECK constraints, widened for S82B's merged
// "Operations & Sponsorship" in migrations/031. Only the five current keys are
// accepted; the pre-S82B "Operations" / "Sponsorship" stay valid in the DB for
// old rows but can no longer be submitted.
const VALID_DOMAINS: readonly string[] = DOMAINS;

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
    const course_choice = optionalString(body.course);
    const course_other = optionalString(body.course_other);

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

    if (!VALID_DOMAINS.includes(domain_interest)) {
      return NextResponse.json(
        { error: "Please select a valid domain" },
        { status: 400 }
      );
    }

    for (const extra of [domain_interest_2, domain_interest_3]) {
      if (extra !== null && !VALID_DOMAINS.includes(extra)) {
        return NextResponse.json(
          { error: "Please select a valid domain" },
          { status: 400 }
        );
      }
    }

    // mobile_raw present but normalisePhone rejected it → not 10 digits
    if (mobile_raw !== null && mobile_number === null) {
      return NextResponse.json(
        { error: "Mobile number must be 10 digits, no country code" },
        { status: 400 }
      );
    }

    // srn_prn_raw present but normaliseSrnPrn rejected it → wrong format
    if (srn_prn_raw !== null && srn_prn === null) {
      return NextResponse.json(
        { error: "SRN / PRN must look like PES1UG21CS999 or PES1201912345" },
        { status: 400 }
      );
    }

    if (semester !== null && !VALID_SEMESTERS.includes(semester as "1" | "3" | "5")) {
      return NextResponse.json(
        { error: "Semester must be 1, 3, or 5" },
        { status: 400 }
      );
    }

    // S81: course is one of the five options; "Other" carries its own text,
    // which is what gets stored.
    if (!(COURSES as readonly string[]).includes(course_choice ?? "")) {
      return NextResponse.json(
        { error: "Please select your course" },
        { status: 400 }
      );
    }
    if (course_choice === "Other" && !course_other) {
      return NextResponse.json(
        { error: "Please type your course" },
        { status: 400 }
      );
    }
    if (course_other !== null && course_other.length > SHORT_ANSWER_MAX) {
      return NextResponse.json(
        { error: `Course must be under ${SHORT_ANSWER_MAX} characters` },
        { status: 400 }
      );
    }
    const course = course_choice === "Other" ? course_other : course_choice;

    // S81: pages 3 + 4. Validates the general questions and ONLY the selected
    // domains' sets; answers for any other domain are dropped. Empty links pass.
    const parsed = parseJoinAnswers(
      body.answers,
      [domain_interest, domain_interest_2, domain_interest_3].filter((d) => d !== null)
    );
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    // S81: why_join / value_addition / domain_experience / design_portfolio_url
    // are no longer asked. The columns stay (old rows, the backup) and new rows
    // leave them NULL -- everything new lives in `answers`.
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
      course,
      answers: parsed.answers,
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
