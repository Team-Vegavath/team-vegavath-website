import { describe, expect, it } from "vitest";

import { PRN_PATTERN, SRN_PATTERN, normaliseSrnPrn } from "./srn";

/**
 * S75. One function, not two -- `normaliseSrnPrn(input, kind?)` handles both
 * structures, and omitting `kind` accepts either (the "SRN / PRN" fields with no
 * toggle). Tested here in that shape rather than as two imagined functions.
 *
 * Every value below is the generic placeholder from the module's own docblock
 * (PES1UG21CS999 / PES1201912345) or a deliberate mutation of it. S73H removed real
 * personal SRN/PRNs from example copy; test fixtures are example copy.
 */
describe("normaliseSrnPrn", () => {
  const VALID_SRN = "PES1UG21CS999";
  const VALID_PRN = "PES1201912345";

  describe("accepts and normalises", () => {
    it("a well-formed SRN", () => {
      expect(normaliseSrnPrn(VALID_SRN)).toBe(VALID_SRN);
      expect(normaliseSrnPrn(VALID_SRN, "SRN")).toBe(VALID_SRN);
    });

    it("a well-formed PRN", () => {
      expect(normaliseSrnPrn(VALID_PRN)).toBe(VALID_PRN);
      expect(normaliseSrnPrn(VALID_PRN, "PRN")).toBe(VALID_PRN);
    });

    /**
     * Confirmed against the implementation rather than assumed: lowercase is
     * UPPERCASED, not rejected. That matters beyond formatting -- the SRN becomes
     * the login username (`srn.toLowerCase()`), so a volunteer typing their SRN in
     * lowercase must land on the same account, not be turned away.
     */
    it("lowercase input, by uppercasing it rather than rejecting", () => {
      expect(normaliseSrnPrn("pes1ug21cs999")).toBe(VALID_SRN);
      expect(normaliseSrnPrn("Pes1Ug21Cs999")).toBe(VALID_SRN);
    });

    it("surrounding and interior whitespace, by stripping it", () => {
      expect(normaliseSrnPrn("  PES1UG21CS999  ")).toBe(VALID_SRN);
      expect(normaliseSrnPrn("PES1 UG21 CS999")).toBe(VALID_SRN);
      expect(normaliseSrnPrn("PES1\tUG21CS999")).toBe(VALID_SRN);
    });

    it("all three campus digits", () => {
      expect(normaliseSrnPrn("PES1UG21CS999")).not.toBeNull();
      expect(normaliseSrnPrn("PES2UG21CS999")).not.toBeNull();
      expect(normaliseSrnPrn("PES3UG21CS999")).not.toBeNull();
    });
  });

  describe("rejects", () => {
    it("a campus digit outside 1-3", () => {
      expect(normaliseSrnPrn("PES4UG21CS999")).toBeNull();
      expect(normaliseSrnPrn("PES0UG21CS999")).toBeNull();
      expect(normaliseSrnPrn("PES4201912345")).toBeNull();
    });

    it("too few characters", () => {
      expect(normaliseSrnPrn("PES1UG21CS99")).toBeNull();
      expect(normaliseSrnPrn("PES120191234")).toBeNull();
      expect(normaliseSrnPrn("PES1")).toBeNull();
    });

    it("too many characters", () => {
      expect(normaliseSrnPrn("PES1UG21CS9999")).toBeNull();
      expect(normaliseSrnPrn("PES12019123456")).toBeNull();
    });

    it("the right length but the wrong internal structure", () => {
      // digit where the 2-letter branch code belongs
      expect(normaliseSrnPrn("PES1UG2199999")).toBeNull();
      // letter where the 3-digit roll number belongs
      expect(normaliseSrnPrn("PES1UG21CS99A")).toBeNull();
      // letter where the batch year digits belong
      expect(normaliseSrnPrn("PES1UGAACS999")).toBeNull();
      // missing the PES prefix entirely
      expect(normaliseSrnPrn("XYZ1UG21CS999")).toBeNull();
    });

    it("an empty string", () => {
      expect(normaliseSrnPrn("")).toBeNull();
      expect(normaliseSrnPrn("   ")).toBeNull();
    });
  });

  /**
   * The whole reason srn.ts matches two shapes instead of checking length 13: a bare
   * length check "would accept either format in either field" (S73F Section A3). When
   * a field names one format, the other must be refused.
   */
  describe("keeps the two structures apart when a kind is given", () => {
    it("refuses a PRN in an SRN-only field", () => {
      expect(normaliseSrnPrn(VALID_PRN, "SRN")).toBeNull();
    });

    it("refuses an SRN in a PRN-only field", () => {
      expect(normaliseSrnPrn(VALID_SRN, "PRN")).toBeNull();
    });

    it("accepts both when no kind is given", () => {
      expect(normaliseSrnPrn(VALID_SRN)).toBe(VALID_SRN);
      expect(normaliseSrnPrn(VALID_PRN)).toBe(VALID_PRN);
    });
  });
});

/**
 * Unlike phone.test.ts, these ARE reproductions of the pre-fix bug.
 *
 * Before S73F the only SRN validation in the codebase was `/^[a-zA-Z0-9]+$/` with
 * `length <= 30`, and only in the two bootstrap registration routes -- /join and the
 * event form had none at all. That rule is a username-typeability check, not a format
 * check. Every value in this block satisfies it, so every one of these tests FAILS on
 * the pre-S73F implementation and passes on the current one.
 */
describe("regression guards -- the S73F 'any alphanumeric string' rule", () => {
  it("rejects arbitrary alphanumeric text, which the pre-S73F rule accepted", () => {
    expect(normaliseSrnPrn("ABC123")).toBeNull();
    expect(normaliseSrnPrn("hello")).toBeNull();
    expect(normaliseSrnPrn("1234567890123")).toBeNull();
  });

  it("rejects an over-long value under 30 chars, which the pre-S73F length rule accepted", () => {
    expect(normaliseSrnPrn("PES1UG21CS999EXTRA")).toBeNull();
  });

  /**
   * S73F exported the pattern SOURCES so the HTML `pattern` attribute and the server
   * check come from one place. Same one-way property as phone.ts: whatever the browser
   * lets through, the server must accept. A future edit to either regex that breaks
   * this is what these two assertions catch.
   */
  it("stays in step with the patterns the forms feed to the HTML pattern attribute", () => {
    expect(new RegExp(`^(?:${SRN_PATTERN})$`).test("PES1UG21CS999")).toBe(true);
    expect(new RegExp(`^(?:${PRN_PATTERN})$`).test("PES1201912345")).toBe(true);
    // the combined field pattern the SRN/PRN inputs actually use
    const combined = new RegExp(`^(?:(${SRN_PATTERN})|(${PRN_PATTERN}))$`);
    for (const value of ["PES1UG21CS999", "PES1201912345", "PES3UG24ME001"]) {
      expect(combined.test(value), `${value} should match the combined field pattern`).toBe(true);
      expect(normaliseSrnPrn(value), `${value} passed the browser but the server rejected it`).not.toBeNull();
    }
  });
});
