// Imported through the `@/` alias on purpose, not as "./group". This is the only
// test that exercises vitest.config.mts's path mapping, so if that alias ever breaks
// this file fails to import and the suite says so loudly. The other test files use
// relative imports, which would keep passing while the app's own imports were broken.
import { describe, expect, it } from "vitest";

import { groupLabel } from "@/lib/utils/group";

/**
 * S75. groupLabel is the inverse of the SQL bridge
 * `g.name = 'Group ' || chr(64 + v.group_number)`, so "Group A" -> "Group 1".
 */
describe("groupLabel", () => {
  it("converts a letter to its 1-based number", () => {
    expect(groupLabel("Group A")).toBe("Group 1");
    expect(groupLabel("Group B")).toBe("Group 2");
    expect(groupLabel("Group Z")).toBe("Group 26");
  });

  it("matches chr(64 + n) across the full A-Z range the DB can hold", () => {
    // createBootstrapGroups clamps to 1-26, so this is the complete domain.
    for (let n = 1; n <= 26; n++) {
      const letter = String.fromCharCode(64 + n);
      expect(groupLabel(`Group ${letter}`)).toBe(`Group ${n}`);
    }
  });

  it("returns an empty string for null, undefined and empty input", () => {
    expect(groupLabel(null)).toBe("");
    expect(groupLabel(undefined)).toBe("");
    expect(groupLabel("")).toBe("");
  });

  it("passes anything that is not exactly 'Group <single capital>' through unchanged", () => {
    expect(groupLabel("Group AA")).toBe("Group AA");
    expect(groupLabel("Overflow")).toBe("Overflow");
    expect(groupLabel("Group")).toBe("Group");
  });

  it("does not double-convert an already-numbered label", () => {
    // Guards against someone wrapping a call site that was already correct.
    expect(groupLabel("Group 1")).toBe("Group 1");
    expect(groupLabel("Group 26")).toBe("Group 26");
  });
});

/**
 * Two inputs the brief asked to be checked explicitly. Both behave the same way:
 * they do NOT convert, they pass through, and the letter stays visible.
 *
 *   groupLabel("group a")  -> "group a"
 *   groupLabel(" Group A") -> " Group A"
 *
 * Called out rather than quietly asserted, because "passes through unchanged" is the
 * documented and correct fallback for a hand-edited name, and is simultaneously a
 * letter leak of exactly the kind S73K existed to close. Which of the two it is
 * depends entirely on whether those values can reach the function.
 *
 * They cannot, from application code. `bootstrap_groups.name` is written in exactly
 * one place -- createBootstrapGroups, as `"Group " + String.fromCharCode(65 + i)` --
 * which is always uppercase and never padded, and no UPDATE anywhere touches `name`
 * (verified by grepping every INSERT/UPDATE against that table). The only way to
 * produce one is a hand-edit in the Neon console.
 *
 * So these are pinned as the CURRENT behaviour, not asserted as the DESIRED one. The
 * invariant they depend on lives in createBootstrapGroups, not here. If a future
 * session ever adds an admin "rename group" control, this block is the thing that
 * should fail review: trimming and case-folding the input inside groupLabel would be
 * the fix, and these two expectations would need inverting.
 *
 * ponytail: not fixed now. Adding .trim()/.toUpperCase() today would be defending
 * against a caller that does not exist, in the one function whose whole job is to be
 * a single obvious source of truth.
 */
describe("inputs that defeat the conversion (unreachable today, documented not fixed)", () => {
  it("does not convert lowercase, because the match is case-sensitive", () => {
    expect(groupLabel("group a")).toBe("group a");
  });

  it("does not convert padded input, because the match is anchored", () => {
    expect(groupLabel(" Group A")).toBe(" Group A");
    expect(groupLabel("Group A ")).toBe("Group A ");
  });
});

/**
 * S73K's bug was ELEVEN call sites rendering `bootstrap_groups.name` raw -- the
 * function below is the fix that session introduced, so no test of it can reproduce
 * the bug. What it can do is pin the contract those eleven sites now depend on. The
 * leak class itself is only catchable by a lint/grep rule over the call sites or by
 * component-level tests, neither of which is in Phase 1's scope.
 */
describe("regression guard -- the S73K contract", () => {
  it("never lets a bare letter through for a well-formed group name", () => {
    for (let n = 1; n <= 26; n++) {
      const label = groupLabel(`Group ${String.fromCharCode(64 + n)}`);
      expect(label, `${label} still contains a letter-based group label`).toMatch(/^Group \d+$/);
    }
  });
});
