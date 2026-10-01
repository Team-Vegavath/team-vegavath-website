import { describe, expect, it } from "vitest";

import { DRIVE_LINK_PATTERN, isValidDriveLink } from "./driveLink";

// A realistic 33-character Drive id.
const ID = "1AbC-dEf_GhIjKlMnOpQrStUvWxYz0123";

describe("isValidDriveLink -- accepts", () => {
  it.each([
    ["file link with /view", `https://drive.google.com/file/d/${ID}/view`],
    ["file link with /view and a query", `https://drive.google.com/file/d/${ID}/view?usp=sharing`],
    ["bare file link", `https://drive.google.com/file/d/${ID}`],
    ["folder link", `https://drive.google.com/drive/folders/${ID}`],
    ["folder link with a query", `https://drive.google.com/drive/folders/${ID}?usp=drive_link`],
    ["folder link with a /u/0/ account segment", `https://drive.google.com/drive/u/0/folders/${ID}`],
    ["open?id= link", `https://drive.google.com/open?id=${ID}`],
    ["docs.google.com document", `https://docs.google.com/document/d/${ID}/edit?usp=sharing`],
    ["docs.google.com spreadsheet with a fragment", `https://docs.google.com/spreadsheets/d/${ID}/edit#gid=0`],
    ["docs.google.com presentation", `https://docs.google.com/presentation/d/${ID}`],
    ["surrounding whitespace", `   https://drive.google.com/file/d/${ID}/view  \n`],
  ])("%s", (_label, link) => {
    expect(isValidDriveLink(link)).toBe(true);
  });

  it("treats empty and whitespace-only as valid -- the field is optional", () => {
    expect(isValidDriveLink("")).toBe(true);
    expect(isValidDriveLink("   ")).toBe(true);
  });
});

describe("isValidDriveLink -- rejects", () => {
  it.each([
    ["http://", `http://drive.google.com/file/d/${ID}/view`],
    ["no scheme", `drive.google.com/file/d/${ID}/view`],
    ["lookalike suffix host", `https://drive.google.com.evil.com/file/d/${ID}/view`],
    ["lookalike prefix host", `https://fakedrive.google.com/file/d/${ID}/view`],
    ["userinfo trick", `https://drive.google.com@evil.com/file/d/${ID}/view`],
    ["non-Drive https URL", "https://example.com/portfolio"],
    ["Drive link with no id", "https://drive.google.com/file/d/"],
    ["Drive home page", "https://drive.google.com/drive/my-drive"],
    ["id too short", "https://drive.google.com/file/d/abc123/view"],
    ["document path on the drive host", `https://drive.google.com/document/d/${ID}`],
    ["trailing path after the id", `https://drive.google.com/file/d/${ID}/../../evil`],
  ])("%s", (_label, link) => {
    expect(isValidDriveLink(link)).toBe(false);
  });
});

describe("DRIVE_LINK_PATTERN", () => {
  // S76B: browsers compile the HTML `pattern` attribute with the `v` flag and
  // silently ignore a pattern that fails to compile. A match test in Node's default
  // mode cannot catch that, so assert compilation the way the browser does it.
  it("compiles under the RegExp v flag, wrapped as the browser wraps it", () => {
    expect(() => new RegExp(`^(?:${DRIVE_LINK_PATTERN})$`, "v")).not.toThrow();
  });

  it("matches under v exactly as isValidDriveLink does", () => {
    const re = new RegExp(`^(?:${DRIVE_LINK_PATTERN})$`, "v");
    expect(re.test(`https://drive.google.com/drive/u/0/folders/${ID}`)).toBe(true);
    expect(re.test(`https://drive.google.com.evil.com/file/d/${ID}`)).toBe(false);
  });
});
