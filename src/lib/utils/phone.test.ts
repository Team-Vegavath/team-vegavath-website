import { describe, expect, it } from "vitest";

import { PHONE_MAX_DIGITS, PHONE_PATTERN, digitsOnly, normalisePhone } from "./phone";

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
   * S76B: this used to assert a THROW. `null.replace` was a TypeError, and S75
   * pinned that as the honest current behaviour rather than papering over it.
   *
   * It is now hardened to degrade to null instead. Still unreachable in production
   * -- all EIGHT callers coerce before calling (re-verified caller by caller in
   * S76B; S75's report said seven, which was stale before the pool route landed).
   * The parameter type stays `string` on purpose: this is "do not crash if it ever
   * happens", not an invitation to start passing nullable values deliberately.
   */
  it("degrades to null rather than throwing when handed null or undefined", () => {
    expect(() => normalisePhone(null as unknown as string)).not.toThrow();
    expect(() => normalisePhone(undefined as unknown as string)).not.toThrow();
    expect(normalisePhone(null as unknown as string)).toBeNull();
    expect(normalisePhone(undefined as unknown as string)).toBeNull();
  });
});

describe("digitsOnly", () => {
  it("strips every non-digit character", () => {
    expect(digitsOnly("98765abcde")).toBe("98765");
    expect(digitsOnly("+91 98765-43210")).toBe("9198765432");
    expect(digitsOnly("abc")).toBe("");
    expect(digitsOnly("")).toBe("");
  });

  it("caps at 10 digits, so the field can never hold more", () => {
    expect(digitsOnly("12345678901234")).toBe("1234567890");
    expect(digitsOnly("12345678901234")).toHaveLength(PHONE_MAX_DIGITS);
  });

  it("leaves a clean 10-digit value untouched", () => {
    expect(digitsOnly("9876543210")).toBe("9876543210");
  });

  /**
   * The property the whole S76B fix rests on: whatever a user types, what lands in
   * React state is 0-10 digits and nothing else. Asserted over the shapes that
   * actually reached the field in the reported bug.
   */
  it("only ever yields 0-10 digits, whatever it is given", () => {
    const inputs = [
      "abc def",
      "98765 43210",
      "+91-98765-43210",
      "((((",
      "9".repeat(50),
      "1a2b3c4d5e6f7g8h9i0j",
      "  ",
    ];
    for (const raw of inputs) {
      const out = digitsOnly(raw);
      expect(out, `${JSON.stringify(raw)} produced ${JSON.stringify(out)}`).toMatch(/^\d{0,10}$/);
    }
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
  /**
   * S76B, and the one test in this file that would have caught the live bug.
   *
   * PHONE_PATTERN was `(\+?91[\s-]?|0)?[0-9]{10}`. That `[\s-]` -- a hyphen directly
   * after a class escape -- is a SYNTAX ERROR under the RegExp `v` flag. Per the HTML
   * spec the `pattern` attribute is compiled with `v`, and a pattern that fails to
   * compile is ignored ENTIRELY: the field then reports valid for any value at all,
   * letters included. Five fields shared this constant, so all five silently lost
   * their client-side validation at once, which is exactly what "the field accepts
   * letters with no resistance" looked like from the outside.
   *
   * It compiled fine under `u` and in Node's default mode, which is why every earlier
   * check of this constant -- including S75's own subset test right below -- passed
   * while the browser was ignoring it.
   *
   * Anything put in an HTML `pattern` attribute must compile under `v`. This asserts
   * that directly rather than trusting a match result, because a match result cannot
   * distinguish "validated and passed" from "never validated at all".
   */
  it("compiles under the RegExp v flag, which is how browsers compile a pattern attribute", () => {
    expect(
      () => new RegExp(`^(?:${PHONE_PATTERN})$`, "v"),
      "PHONE_PATTERN does not compile under the v flag, so browsers will IGNORE it and accept any input"
    ).not.toThrow();
  });

  it("matches identically under v, u and the default mode", () => {
    const cases = ["9876543210", "+919876543210", "09876543210", "987654321", "98765abcde", "98765 4321"];
    for (const flags of ["", "u", "v"]) {
      const re = new RegExp(`^(?:${PHONE_PATTERN})$`, flags);
      for (const value of cases) {
        expect(re.test(value), `${JSON.stringify(value)} differs under flags "${flags}"`).toBe(
          /^(?:(\+?91[\s-]?|0)?[0-9]{10})$/.test(value)
        );
      }
    }
  });

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
