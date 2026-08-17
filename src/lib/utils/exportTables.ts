import type { PoolVolunteer } from "@/lib/services/bootstrap";
import type { Application } from "@/types/settings";

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

export function applicationsTable(apps: Application[]): ExportTable {
  return {
    name: "vegavath-applications",
    headers: [
      "Name", "Email", "Mobile", "SRN/PRN", "Semester",
      "Domain 1", "Domain 2", "Domain 3",
      "Why Join", "Value Add", "Experience", "Portfolio",
      "Status", "Interview Group", "Submitted",
    ],
    rows: apps.map((a) => [
      a.name, a.email, a.mobile_number, a.srn_prn, a.semester,
      a.domain_interest, a.domain_interest_2, a.domain_interest_3,
      a.why_join, a.value_addition, a.domain_experience,
      a.design_portfolio_url, a.status, a.interview_group,
      shortDate(a.submitted_at),
    ]),
  };
}

// Login codes ARE included, matching the pool table this exports from, where
// they already render in plaintext (S55C).
export function poolVolunteersTable(pool: PoolVolunteer[]): ExportTable {
  return {
    name: "vegavath-volunteer-pool",
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
