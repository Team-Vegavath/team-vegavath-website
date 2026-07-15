import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getApplications } from "@/lib/services/applications";
import type { ApplicationStatus } from "@/types/settings";

// Quote every field; doubling embedded quotes also makes commas and
// newlines inside a field safe per RFC 4180.
function esc(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status");
  const apps = await getApplications({
    status: (status as ApplicationStatus) || undefined,
    limit: 500,
  });

  const headers = [
    "Name", "Email", "Mobile", "SRN/PRN", "Semester",
    "Domain 1", "Domain 2", "Domain 3",
    "Why Join", "Value Add", "Experience", "Portfolio",
    "Status", "Interview Group", "Submitted",
  ];

  const rows = apps.map((a) =>
    [
      a.name, a.email, a.mobile_number, a.srn_prn, a.semester,
      a.domain_interest, a.domain_interest_2, a.domain_interest_3,
      a.why_join, a.value_addition, a.domain_experience,
      a.design_portfolio_url, a.status, a.interview_group,
      new Date(a.submitted_at).toLocaleDateString("en-IN"),
    ].map(esc).join(",")
  );

  const csv = [headers.map(esc).join(","), ...rows].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vegavath-applications-${Date.now()}.csv"`,
    },
  });
}
