/**
 * PES SRN / PRN validation. Both are exactly 13 characters, but they are two
 * different structures -- a length check alone would accept either format in
 * either field, so match the real shape instead.
 *
 *   SRN  PES2UG24CS019 = PES | campus 2 | programme UG | batch 24 | branch CS | roll 019
 *   PRN  PES2202400960 = PES | campus 2 | year 2024 | id 00960
 *
 * Campus is 1-3 (three PES campuses in Bengaluru). A fourth campus is a
 * one-character edit here rather than a rule spread across six call sites.
 *
 * The pattern SOURCES are exported because the forms feed them straight into
 * the HTML `pattern` attribute (implicitly anchored there, explicitly anchored
 * below). One source of truth means the browser check and the API check cannot
 * drift apart. This module is pure -- client components may import it.
 */
export const SRN_PATTERN = "PES[1-3][A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{3}";
export const PRN_PATTERN = "PES[1-3][0-9]{9}";

const SRN_RE = new RegExp(`^${SRN_PATTERN}$`);
const PRN_RE = new RegExp(`^${PRN_PATTERN}$`);

export type SrnPrnKind = "SRN" | "PRN";

/**
 * Uppercases, strips whitespace, and validates against the SRN pattern, the
 * PRN pattern, or either when `kind` is omitted (fields labelled "SRN / PRN"
 * with no toggle accept both).
 * Returns the normalised value, or null when it does not match.
 */
export function normaliseSrnPrn(input: string, kind?: SrnPrnKind): string | null {
  const value = input.replace(/\s/g, "").toUpperCase();
  if (kind === "SRN") return SRN_RE.test(value) ? value : null;
  if (kind === "PRN") return PRN_RE.test(value) ? value : null;
  return SRN_RE.test(value) || PRN_RE.test(value) ? value : null;
}
