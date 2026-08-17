import { describe, expect, it } from "vitest";

import { PHONE_PATTERN, normalisePhone } from "./phone";

/**
 * S75. Read the note under "Historical bugs" before adding a test here that claims
 * to guard S73F or S73I -- neither of those bugs lived in this function.
 */
describe("normalisePhone", () => {
  describe("accepts", () => {
    it("exactly 10 digits, returned unchanged", () => {
      expect(normalisePhone("9876543210")).toBe("9876543210");
    });

    it("a +91 prefix, stripped", () => {
      expect(normalisePhone("+919876543210")).toBe("9876543210");
    });

    it("a bare 91 country code, stripped", () => {
      expect(normalisePhone("919876543210")).toBe("9876543210");
    });

    it("separators, stripped", () => {
      expect(normalisePhone("98765 43210")).toBe("9876543210");
      expect(normalisePhone("987-654-3210")).toBe("9876543210");
      expect(normalisePhone("(98765) 43210")).toBe("9876543210");
      expect(normalisePhone("+91 98765-43210")).toBe("9876543210");
    });
  });

  describe("rejects", () => {
    it("fewer than 10 digits", () => {
      expect(normalisePhone("987654321")).toBeNull();
      expect(normalisePhone("1")).toBeNull();
    });

    it("11 digits that do not start with a trunk 0", () => {
      expect(normalisePhone("98765432101")).toBeNull();
    });

    it("12 digits that do not start with 91", () => {
      expect(normalisePhone("887654321012")).toBeNull();
    });

    it("13+ digits, prefix or not", () => {
      expect(normalisePhone("+9198765432101")).toBeNull();
      expect(normalisePhone("0919876543210")).toBeNull();
    });

    it("an empty string", () => {
      expect(normalisePhone("")).toBeNull();
    });

    it("a string with no digits at all", () => {
      expect(normalisePhone("not a phone number")).toBeNull();
      expect(normalisePhone("+-() ")).toBeNull();
    });
  });

  /**
   * The signature is `(input: string)`, so null/undefined are a type error, not a
   * runtime case -- every caller reaches it through `String(body?.phone ?? "")`.
   * Pinned as a THROW rather than quietly asserting null, because that is what the
   * code actually does: `null.replace` is a TypeError. If someone later makes the
   * parameter optional, this test fails and forces the decision to be explicit
   * instead of silently turning a crash into a null.
   *
   * ponytail: the function is NOT being changed to accept null. It has seven
   * callers that all coerce already, and widening the signature to satisfy a test
   * would be the test dictating production behaviour.
   */
  it("throws rather than returning null when handed null (callers coerce upstream)", () => {
    expect(() => normalisePhone(null as unknown as string)).toThrow(TypeError);
  });
});

/**
 * Historical bugs -- what a unit test here can and cannot guard.
 *
 * S73F and S73I are both recorded in docs/revamp-log.md as phone bugs, and NEITHER
 * was a bug in this function. S73F's own entry says so outright: "normalisePhone
 * has always been right. It was not the bug. The bug was coverage." Four of seven
 * write paths never called it, and S73I was entirely client-side -- maxLength left
 * at 16-20, and two fields with no <form> around them so their `pattern` never ran.
 *
 * So none of the tests above would have failed on the pre-S73F code, and none of
 * them is labelled as if it would. A test named for a bug it cannot reproduce is
 * worse than no test: it reads as coverage while leaving the real failure mode open.
 * Catching that class needs route-level tests (Phase 2) and a lint/grep rule that
 * every phone write path calls this function.
 *
 * The two properties below ARE real and ARE reachable from here.
 */
describe("regression guards", () => {
  /**
   * S73F changed exactly one behaviour in this function: an 11-digit input with a
   * leading trunk 0 used to be rejected and is now stripped to 10. This is the only
   * test in this file that would have failed on the pre-S73F implementation.
   */
  it("strips a leading trunk 0 from 11 digits (behaviour ADDED by S73F)", () => {
    expect(normalisePhone("09876543210")).toBe("9876543210");
    expect(normalisePhone("0 98765 43210")).toBe("9876543210");
  });

  /**
   * The invariant S73F and S73I actually established: the browser rule and the API
   * rule "cannot drift apart" because the forms feed PHONE_PATTERN straight into the
   * HTML pattern attribute. Direction matters -- the function is deliberately a
   * SUPERSET (it also tolerates separators mid-number, which the pattern does not),
   * so the property is one-way: anything the browser lets through, the API must
   * accept. The reverse is not required and is not asserted.
   *
   * This is what fails if a future session tightens one side and forgets the other,
   * which is the drift both sessions were written to prevent.
   */
  it("accepts everything PHONE_PATTERN accepts, so no form can submit a value the API rejects", () => {
    const anchored = new RegExp(`^(?:${PHONE_PATTERN})$`);
    const browserAccepts = [
      "9876543210",
      "919876543210",
      "+919876543210",
      "+91 9876543210",
      "+91-9876543210",
      "91 9876543210",
      "09876543210",
    ];
    for (const value of browserAccepts) {
      expect(anchored.test(value), `${value} should match PHONE_PATTERN`).toBe(true);
      expect(normalisePhone(value), `${value} passed the browser but the API rejected it`).not.toBeNull();
    }
  });
});
