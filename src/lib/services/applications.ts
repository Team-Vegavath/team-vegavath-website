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
  options: {
    status?: ApplicationStatus;
    interviewGroup?: string;
    limit?: number;
  } = {}
): Promise<Application[]> {
  const { status, interviewGroup, limit = 50 } = options;
  // interview_group only referenced when actually filtering by it, so
  // plain listing keeps working before migration 011 is applied.
  const rows = interviewGroup
    ? await sql`
        SELECT * FROM applications
        WHERE interview_group = ${interviewGroup}
          AND (${status ?? null}::text IS NULL OR status = ${status ?? null})
        ORDER BY submitted_at DESC
        LIMIT ${limit}`
    : await sql`
        SELECT * FROM applications
        WHERE (${status ?? null}::text IS NULL OR status = ${status ?? null})
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

export async function setInterviewGroup(
  id: string,
  group: string | null
): Promise<void> {
  await sql`
    UPDATE applications SET interview_group = ${group} WHERE id = ${id}`;
}

// Round-robin unassigned interview applicants into panels A..(panelCount).
// Oldest submissions first so panel A doesn't skew recent. Returns how many
// rows were assigned.
export async function autoAssignInterviewGroups(panelCount: number): Promise<number> {
  const panels = ["A", "B", "C", "D"].slice(0, panelCount);
  const rows = await sql`
    SELECT id FROM applications
    WHERE status = 'interview' AND interview_group IS NULL
    ORDER BY submitted_at ASC`;
  if (!rows.length) return 0;
  const idArr = (rows as { id: string }[]).map((r) => r.id);
  const grpArr = idArr.map((_, i) => panels[i % panels.length]);
  // unnest pairs ids with groups so the whole assignment is ONE statement
  await sql`
    UPDATE applications SET interview_group = data.grp
    FROM (
      SELECT unnest(${idArr}::uuid[]) AS id, unnest(${grpArr}::text[]) AS grp
    ) AS data
    WHERE applications.id = data.id`;
  return idArr.length;
}

export async function bulkSetStatus(
  ids: string[],
  status: ApplicationStatus
): Promise<string[]> {
  const rows = await sql`
    UPDATE applications SET status = ${status}
    WHERE id = ANY(${ids}::uuid[])
    RETURNING id`;
  return (rows as { id: string }[]).map((r) => r.id);
}