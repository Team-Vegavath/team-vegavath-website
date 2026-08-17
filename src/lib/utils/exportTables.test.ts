import { describe, expect, it } from "vitest";

import type { PoolVolunteer } from "@/lib/services/bootstrap";
import type { Application } from "@/types/settings";

import { applicationsTable, poolVolunteersTable, toCsv } from "./exportTables";
import type { ExportTable } from "./exportTables";

/**
 * S75. These two table builders feed BOTH the CSV download and the Google Sheets
 * export (S73K, rewritten S74A), which is the reason they were extracted in the first
 * place -- so the two destinations cannot disagree about what a dataset contains.
 *
 * The type-only imports above are what keep this file DB-free: `PoolVolunteer` and
 * `Application` are erased at compile time, so nothing here loads lib/db.ts or opens a
 * Neon connection. Phase 1 stays pure.
 */

const table = (rows: ExportTable["rows"]): ExportTable => ({
  name: "t",
  tab: "T",
  headers: ["A", "B"],
  rows,
});

describe("toCsv", () => {
  it("quotes every field and emits CRLF line endings", () => {
    expect(toCsv(table([["x", "y"]]))).toBe('"A","B"\r\n"x","y"');
  });

  it("keeps a field containing a comma in one column", () => {
    const csv = toCsv(table([["Bengaluru, KA", "ok"]]));
    expect(csv).toBe('"A","B"\r\n"Bengaluru, KA","ok"');
    // the comma must be inside the quotes, not acting as a delimiter
    expect(csv.split("\r\n")[1]).toBe('"Bengaluru, KA","ok"');
  });

  it("doubles an embedded double quote, per RFC 4180", () => {
    expect(toCsv(table([['He said "hi"', "ok"]]))).toBe('"A","B"\r\n"He said ""hi""","ok"');
  });

  it("keeps a field containing a newline inside its quotes", () => {
    const csv = toCsv(table([["line one\nline two", "ok"]]));
    expect(csv).toBe('"A","B"\r\n"line one\nline two","ok"');
  });

  it("renders null and undefined as empty fields rather than the words", () => {
    expect(toCsv(table([[null, undefined]]))).toBe('"A","B"\r\n"",""');
  });

  it("emits a header-only document for an empty dataset, without throwing", () => {
    const csv = toCsv(table([]));
    expect(csv).toBe('"A","B"');
    expect(csv.split("\r\n")).toHaveLength(1);
  });

  it("survives a field that is nothing but delimiters and quotes", () => {
    expect(toCsv(table([['",\r\n', "ok"]]))).toBe('"A","B"\r\n""",\r\n","ok"');
  });
});

/**
 * The failure these guard is silent and ugly: add a column to `headers` and forget the
 * matching cell in `rows` (or vice versa) and every value after that point shifts one
 * column left in the spreadsheet. Nothing throws -- the export just quietly lies.
 */
describe("column alignment", () => {
  const application: Application = {
    id: "a1",
    name: "Example Student",
    email: "example@example.com",
    domain_interest: "Design",
    domain_interest_2: null,
    domain_interest_3: null,
    portfolio_url: null,
    mobile_number: "9876543210",
    srn_prn: "PES1UG21CS999",
    semester: "3",
    why_join: null,
    value_addition: null,
    domain_experience: null,
    design_portfolio_url: null,
    status: "pending",
    interview_group: null,
    submitted_at: "2026-08-17T10:00:00.000Z",
  };

  const poolVolunteer: PoolVolunteer = {
    id: "v1",
    display_name: "Example Volunteer",
    username: "pes1ug21cs999",
    srn: "PES1UG21CS999",
    phone: "9876543210",
    preferred_stall_name: "Go-Kart",
    role: "stall",
    login_code: "abcd2345",
    created_at: "2026-08-17T10:00:00.000Z",
  };

  it("applicationsTable gives every row exactly as many cells as there are headers", () => {
    const t = applicationsTable([application, application]);
    expect(t.rows).toHaveLength(2);
    for (const row of t.rows) {
      expect(row).toHaveLength(t.headers.length);
    }
  });

  it("poolVolunteersTable gives every row exactly as many cells as there are headers", () => {
    const t = poolVolunteersTable([poolVolunteer]);
    for (const row of t.rows) {
      expect(row).toHaveLength(t.headers.length);
    }
  });

  it("both builders name a CSV stem and a Sheets tab", () => {
    // S74A added `tab`; an empty one would send a Sheets export to a nameless range.
    for (const t of [applicationsTable([]), poolVolunteersTable([])]) {
      expect(t.name).not.toBe("");
      expect(t.tab).not.toBe("");
    }
  });

  it("produces a header-only CSV when there are no records", () => {
    expect(toCsv(applicationsTable([])).split("\r\n")).toHaveLength(1);
    expect(toCsv(poolVolunteersTable([])).split("\r\n")).toHaveLength(1);
  });
});

/**
 * Deliberately NOT tested: the exact string `shortDate` produces. It is
 * `toLocaleDateString("en-IN")`, whose output depends on the ICU build and timezone of
 * whatever machine runs the suite, so asserting "17/8/2026" would pass here and fail on
 * a CI runner in another timezone. The column-count tests above already prove the date
 * cell exists and is positioned correctly, which is the part that can silently break.
 */
