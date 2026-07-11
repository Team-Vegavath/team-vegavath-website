import { sql } from "@/lib/db";
import type {
  Application,
  ApplicationStatus,
  CreateApplicationInput,
} from "@/types/settings";

export async function createApplication(
  input: CreateApplicationInput
): Promise<Application> {
  // domain_interest_2/3 require migrations/003; the FY26 columns
  // (mobile_number … design_portfolio_url) require migrations/004.
  const rows = await sql`
    INSERT INTO applications (
      name, email, domain_interest, domain_interest_2, domain_interest_3,
      portfolio_url, mobile_number, srn_prn, semester,
      why_join, value_addition, domain_experience, design_portfolio_url
    ) VALUES (
      ${input.name}, ${input.email}, ${input.domain_interest},
      ${input.domain_interest_2 ?? null}, ${input.domain_interest_3 ?? null},
      ${input.portfolio_url ?? null},
      ${input.mobile_number ?? null}, ${input.srn_prn ?? null}, ${input.semester ?? null},
      ${input.why_join ?? null}, ${input.value_addition ?? null},
      ${input.domain_experience ?? null}, ${input.design_portfolio_url ?? null}
    ) RETURNING *`;
  return rows[0] as Application;
}

export async function getApplications(
  options: { status?: ApplicationStatus; limit?: number } = {}
): Promise<Application[]> {
  const { status, limit = 50 } = options;
  if (status) {
    const rows = await sql`
      SELECT * FROM applications
      WHERE status = ${status}
      ORDER BY submitted_at DESC
      LIMIT ${limit}`;
    return rows as Application[];
  }
  const rows = await sql`
    SELECT * FROM applications
    ORDER BY submitted_at DESC
    LIMIT ${limit}`;
  return rows as Application[];
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus
): Promise<void> {
  await sql`
    UPDATE applications SET status = ${status} WHERE id = ${id}`;
}

export async function deleteApplication(id: string): Promise<void> {
  await sql`DELETE FROM applications WHERE id = ${id}`;
}