import type { PoolVolunteer } from "@/lib/services/bootstrap";
import type { Application } from "@/types/settings";

import { QUESTION_GROUPS } from "./joinQuestions";

/**
 * S73K: what an export CONTAINS, in one place per dataset.
 *
 * Each dataset now has two destinations -- a CSV download and a Google Sheet --
 * and the fastest way for those to disagree is for each route to build its own
 * column list. So the shape is built once here and the destination decides only
 * how to serialise it.
 *
 * Type-only imports from the services layer: this module is pure and carries no
 * SQL, but keeping the imports type-only means it can never drag lib/db.ts
 * anywhere it should not go.
 */
export interface ExportTable {
  /** Filename stem, no extension and no timestamp -- callers add those. */
  name: string;
  /**
   * S74A: the tab this dataset owns in the shared "Vegavath_Exports"
   * spreadsheet. Declared here beside the columns rather than derived from
   * `name` inside googleExport, so the human-facing tab title is stated once and
   * not reverse-engineered from a filename stem by string surgery.
   */
  tab: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

// Quote every field; doubling embedded quotes also makes commas and
// newlines inside a field safe per RFC 4180. Unchanged from the inline version
// that shipped with the applications export.
function esc(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function toCsv(table: ExportTable): string {
  return [
    table.headers.map(esc).join(","),
    ...table.rows.map((row) => row.map(esc).join(",")),
  ].join("\r\n");
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN");

// S81: one column per question on the new form (plus one for each "Other"
// text), headed "<set>: <question>". Columns exist for every set, not just the
// selected ones, so every row has the same shape; an unanswered cell is empty.
const ANSWER_COLUMNS = QUESTION_GROUPS.flatMap(({ title, questions }) =>
  questions.flatMap((q) => {
    const col = { header: `${title}: ${q.label}`, id: q.id };
    return q.kind === "multi" && q.otherId
      ? [col, { header: `${col.header} (Other)`, id: q.otherId }]
      : [col];
  })
);

// S81: this export is the backup taken before old applications are deleted, so
// it carries EVERY column of the table -- including `id`, the FY25
// `portfolio_url`, and the full submitted timestamp, which "Submitted" alone
// rounds to a date. The old question columns stay alongside the new answers:
// old rows fill the former, new rows the latter. The test pins this against a
// fixture of every field.
export function applicationsTable(apps: Application[]): ExportTable {
  return {
    name: "vegavath-applications",
    tab: "Applications",
    headers: [
      "ID", "Name", "Email", "Mobile", "SRN/PRN", "Semester", "Course",
      "Domain 1", "Domain 2", "Domain 3",
      "Why Join", "Value Add", "Experience", "Portfolio", "Portfolio (FY25)",
      "Status", "Interview Group", "Submitted", "Submitted At (UTC)",
      ...ANSWER_COLUMNS.map((c) => c.header),
    ],
    rows: apps.map((a) => [
      a.id, a.name, a.email, a.mobile_number, a.srn_prn, a.semester, a.course,
      a.domain_interest, a.domain_interest_2, a.domain_interest_3,
      a.why_join, a.value_addition, a.domain_experience,
      a.design_portfolio_url, a.portfolio_url, a.status, a.interview_group,
      shortDate(a.submitted_at), new Date(a.submitted_at).toISOString(),
      ...ANSWER_COLUMNS.map((c) => {
        const v = a.answers?.[c.id];
        return Array.isArray(v) ? v.join(", ") : v;
      }),
    ]),
  };
}

// Login codes ARE included, matching the pool table this exports from, where
// they already render in plaintext (S55C).
export function poolVolunteersTable(pool: PoolVolunteer[]): ExportTable {
  return {
    name: "vegavath-volunteer-pool",
    tab: "Pool Volunteers",
    headers: [
      "Name", "Username", "SRN", "Phone",
      "Preferred Stall", "Login Code", "Registered",
    ],
    rows: pool.map((v) => [
      v.display_name, v.username, v.srn, v.phone,
      v.preferred_stall_name, v.login_code,
      shortDate(v.created_at),
    ]),
  };
}
