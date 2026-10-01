import { describe, expect, it } from "vitest";

import {
  CODE_PROFILE_PATTERN,
  CODE_REPO_PATTERN,
  isValidCodeProfileLink,
  isValidCodeRepoLink,
} from "./codeHostLink";

// Inputs a student testing the form's limits would actually try.
const NEVER: [string, string][] = [
  ["http://", "http://github.com/someone/rover"],
  ["no scheme", "github.com/someone/rover"],
  ["lookalike suffix host", "https://github.com.evil.com/someone/rover"],
  ["lookalike prefix host", "https://evilgithub.com/someone/rover"],
  ["userinfo trick", "https://github.com@evil.com/someone/rover"],
  ["gist", "https://gist.github.com/someone/abc123"],
  ["raw content host", "https://raw.githubusercontent.com/someone/rover/main/README.md"],
  ["another code host", "https://bitbucket.org/someone/rover"],
  ["bare host", "https://github.com/"],
  ["owner starting with a hyphen", "https://github.com/-someone/rover"],
  ["javascript: URL", "javascript:alert(1)"],
];

describe("isValidCodeRepoLink (Robotics)", () => {
  it.each([
    ["GitHub repo", "https://github.com/someone/rover"],
    ["GitHub repo, deeper path", "https://github.com/someone/rover/tree/main/firmware"],
    ["GitHub repo with www. and .git", "https://www.github.com/some-one/rover.git"],
    ["GitLab project", "https://gitlab.com/someone/rover"],
    ["GitLab nested group", "https://gitlab.com/team/robotics/rover"],
    ["GitLab deeper path", "https://gitlab.com/someone/rover/-/tree/main"],
    ["surrounding whitespace", "  https://github.com/someone/rover \n"],
  ])("accepts %s", (_label, link) => {
    expect(isValidCodeRepoLink(link)).toBe(true);
  });

  it("treats empty as valid -- the field is optional", () => {
    expect(isValidCodeRepoLink("")).toBe(true);
    expect(isValidCodeRepoLink("  ")).toBe(true);
  });

  it.each([
    ["GitHub profile (not a repo)", "https://github.com/someone"],
    ["GitLab profile (not a repo)", "https://gitlab.com/someone"],
    ...NEVER,
  ])("rejects %s", (_label, link) => {
    expect(isValidCodeRepoLink(link)).toBe(false);
  });
});

describe("isValidCodeProfileLink (Coding)", () => {
  it.each([
    ["GitHub profile", "https://github.com/someone"],
    ["GitHub profile with a tab query", "https://github.com/someone?tab=repositories"],
    ["GitLab profile", "https://gitlab.com/some.one"],
    ["GitHub repo", "https://github.com/someone/rover"],
    ["GitLab repo", "https://gitlab.com/someone/rover"],
  ])("accepts %s", (_label, link) => {
    expect(isValidCodeProfileLink(link)).toBe(true);
  });

  it.each([["a personal site", "https://someone.dev"], ...NEVER])("rejects %s", (_label, link) => {
    expect(isValidCodeProfileLink(link)).toBe(false);
  });
});

describe("pattern sources", () => {
  // S76B: browsers compile `pattern` with the v flag and ignore one that fails.
  it.each([
    ["CODE_REPO_PATTERN", CODE_REPO_PATTERN],
    ["CODE_PROFILE_PATTERN", CODE_PROFILE_PATTERN],
  ])("%s compiles under the v flag, wrapped as the browser wraps it", (_name, pattern) => {
    expect(() => new RegExp(`^(?:${pattern})$`, "v")).not.toThrow();
  });
});
