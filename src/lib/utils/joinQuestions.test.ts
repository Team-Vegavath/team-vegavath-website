import { describe, expect, it } from "vitest";

import {
  DOMAINS,
  GENERAL_QUESTIONS,
  JOIN_DOMAINS,
  LINK_RULES,
  QUESTION_SETS,
  TRACKS,
  domainLabel,
  orderedDomainLabels,
  parseJoinAnswers,
  setTitle,
  sortDomains,
} from "./joinQuestions";

/**
 * S81: parseJoinAnswers is the server half of /join's page 3 + page 4 rules.
 * The cases below are the brief's hard requirements: an empty link never fails,
 * only selected domains are read, a deselected domain's answers are dropped,
 * and a question hidden by a Design / Social Media or Automotives / Robotics
 * checkbox is neither required nor stored.
 */

const general = Object.fromEntries(GENERAL_QUESTIONS.map((q) => [q.id, `answer to ${q.id}`]));

const social = {
  dsm_tracks: ["Social Media"],
  dsm_content_types: "behind-the-scenes builds",
  dsm_instagram_idea: "a pit-stop timelapse",
  dsm_comfortable_with: ["Reels"],
  dsm_experience: "No experience",
};

const DRIVE = "https://drive.google.com/file/d/1AbC-dEf_GhIjKlMnOpQrStUvWxYz0123/view";

// S82B: Operations and Sponsorship are one domain, so picking it always needs
// the two (required) Operations answers; Sponsorship's question stays optional.
const OS = "Operations & Sponsorship";
const ops = { ops_running_events: "Clear roles and a plan", ops_experience: "No experience" };

const ok = (raw: unknown, domains: string[]) => {
  const result = parseJoinAnswers(raw, domains);
  if (!("answers" in result)) throw new Error(`expected success, got: ${result.error}`);
  return result.answers;
};

describe("parseJoinAnswers -- domains", () => {
  it("accepts a submission with every link field empty or missing", () => {
    const answers = ok(
      {
        ...general, ...social, dsm_portfolio_link: "  ",
        cad_experience: "No experience", cad_link_for: ["Automotives"], cad_auto_link: "",
        code_experience: "No experience",
      },
      ["Social Media", "Automotives", "Coding"]
    );
    for (const key of ["dsm_portfolio_link", "cad_auto_link", "code_profile_link"]) {
      expect(answers).not.toHaveProperty(key);
    }
  });

  it("rejects a missing required general answer", () => {
    const rest: Record<string, string> = { ...general };
    delete rest.general_why_vegavath;
    expect(parseJoinAnswers({ ...rest, ...ops }, [OS])).toHaveProperty("error");
  });

  it("drops a deselected domain's answers and ignores unknown keys", () => {
    const code = { code_experience: "a CLI tool" };
    const answers = ok({ ...general, ...code, ...ops, injected: "x" }, ["Coding"]);
    expect(answers).toEqual({ ...general, ...code });
  });

  it("enforces each selected set's required answers", () => {
    expect(parseJoinAnswers(general, [OS])).toHaveProperty("error"); // Operations half
    expect(parseJoinAnswers(general, ["Coding"])).toHaveProperty("error");
    expect(parseJoinAnswers(general, ["Robotics"])).toHaveProperty("error");
    // The Sponsorship half is optional: Operations answers alone are enough.
    expect(ok({ ...general, ...ops }, [OS])).not.toHaveProperty("spon_experience");
  });

  it("reads a pre-S82B key as no current domain -- the route rejects it first", () => {
    // /api/join only accepts DOMAINS, so old keys never reach the parser from
    // the form; if they did, they would select no question set.
    expect(ok(general, ["Operations", "Sponsorship"])).toEqual(general);
  });

  it("accepts only GitHub / GitLab links for the Coding profile link", () => {
    const base = { ...general, code_experience: "a CLI tool" };
    for (const bad of ["http://github.com/me", "javascript:alert(1)", "https://someone.dev"]) {
      expect(parseJoinAnswers({ ...base, code_profile_link: bad }, ["Coding"])).toHaveProperty("error");
    }
    for (const good of ["https://github.com/me", "https://gitlab.com/me", "https://github.com/me/cli"]) {
      expect(ok({ ...base, code_profile_link: good }, ["Coding"])).toHaveProperty("code_profile_link", good);
    }
  });

  it("rejects a filled-in answer under 10 characters, required or optional", () => {
    const base = { ...general, ...ops };
    for (const lazy of [".", "idk", "no", "123456789"]) {
      expect(parseJoinAnswers({ ...base, general_why_vegavath: lazy }, [OS]))
        .toHaveProperty("error");
      expect(parseJoinAnswers({ ...base, spon_experience: lazy }, [OS]))
        .toHaveProperty("error");
    }
    // Exactly 10 passes; padding does not count, because the server trims.
    expect(ok({ ...base, spon_experience: "1234567890" }, [OS]))
      .toHaveProperty("spon_experience", "1234567890");
    expect(parseJoinAnswers({ ...base, spon_experience: "   idk      " }, [OS]))
      .toHaveProperty("error");
    // An optional answer can still be left empty, and "No experience" clears the bar.
    expect(ok({ ...base, spon_experience: "" }, [OS])).not.toHaveProperty("spon_experience");
    expect(ok({ ...base, spon_experience: "No experience" }, [OS]))
      .toHaveProperty("spon_experience", "No experience");
  });

  it("does not apply the minimum to the short Other box", () => {
    const answers = ok(
      { ...general, ...social, dsm_comfortable_with: ["Other"], dsm_comfortable_other: "Podcasts" },
      ["Social Media"]
    );
    expect(answers).toHaveProperty("dsm_comfortable_other", "Podcasts");
  });

  it("rejects an answer over the max length", () => {
    const long = { ...general, ...ops, general_why_vegavath: "x".repeat(2001) };
    expect(parseJoinAnswers(long, [OS])).toHaveProperty("error");
  });
});

describe("parseJoinAnswers -- Design / Social Media split", () => {
  it("requires picking at least one of Design / Social Media", () => {
    expect(parseJoinAnswers({ ...general, ...social, dsm_tracks: [] }, ["Social Media"]))
      .toHaveProperty("error");
  });

  it("social-only: design questions are neither required nor stored", () => {
    const answers = ok(
      { ...general, ...social, dsm_design_types: ["Posters"], dsm_portfolio_drive: DRIVE },
      ["Social Media"]
    );
    expect(answers).not.toHaveProperty("dsm_design_types");
    expect(answers).not.toHaveProperty("dsm_portfolio_drive");
  });

  it("design-only: requires a design type, and social questions are not required", () => {
    const design = { ...general, dsm_tracks: ["Design"] };
    expect(parseJoinAnswers(design, ["Social Media"])).toHaveProperty("error");
    expect(ok({ ...design, dsm_design_types: ["UI/UX"] }, ["Social Media"]))
      .toEqual({ ...general, dsm_tracks: ["Design"], dsm_design_types: ["UI/UX"] });
  });

  it("requires the Other text only when Other is ticked", () => {
    const withOther = { ...general, ...social, dsm_comfortable_with: ["Reels", "Other"] };
    expect(parseJoinAnswers(withOther, ["Social Media"])).toHaveProperty("error");
    expect(ok({ ...withOther, dsm_comfortable_other: " Podcasts " }, ["Social Media"]))
      .toHaveProperty("dsm_comfortable_other", "Podcasts");
  });
});

describe("parseJoinAnswers -- Automotives / Robotics links", () => {
  const cad = { ...general, cad_experience: "No experience" };

  it("stores each domain's link under its own key", () => {
    const answers = ok(
      { ...cad, cad_link_for: ["Automotives", "Robotics"], cad_auto_link: DRIVE, cad_robotics_link: ` ${DRIVE} ` },
      ["Automotives", "Robotics"]
    );
    expect(answers).toHaveProperty("cad_auto_link", DRIVE);
    expect(answers).toHaveProperty("cad_robotics_link", DRIVE);
  });

  it("drops a link whose checkbox is not ticked", () => {
    const answers = ok({ ...cad, cad_link_for: ["Robotics"], cad_auto_link: DRIVE }, ["Automotives", "Robotics"]);
    expect(answers).not.toHaveProperty("cad_auto_link");
  });

  it("only offers the domains that were picked: Robotics-only cannot tick Automotives", () => {
    const answers = ok({ ...cad, cad_link_for: ["Automotives"], cad_auto_link: DRIVE }, ["Robotics"]);
    expect(answers).not.toHaveProperty("cad_link_for");
    expect(answers).not.toHaveProperty("cad_auto_link");
  });

  it("Robotics takes Drive or a GitHub / GitLab repo; Automotives takes Drive only", () => {
    const both = { ...cad, cad_link_for: ["Automotives", "Robotics"] };
    const domains = ["Automotives", "Robotics"];
    for (const link of [DRIVE, "https://github.com/me/rover", "https://gitlab.com/team/rover"]) {
      expect(ok({ ...both, cad_robotics_link: link }, domains)).toHaveProperty("cad_robotics_link", link);
    }
    // A profile is not a project.
    expect(parseJoinAnswers({ ...both, cad_robotics_link: "https://github.com/me" }, domains))
      .toHaveProperty("error");
    expect(parseJoinAnswers({ ...both, cad_auto_link: "https://github.com/me/rover" }, domains))
      .toHaveProperty("error");
  });

  it("rejects a malformed Drive link once its box is shown", () => {
    expect(parseJoinAnswers(
      { ...cad, cad_link_for: ["Robotics"], cad_robotics_link: "https://example.com/x" },
      ["Robotics"]
    )).toHaveProperty("error");
  });
});

describe("LINK_RULES", () => {
  // S76B: every pattern reaches an HTML `pattern` attribute, which the browser
  // compiles with the v flag and silently ignores if it fails -- including the
  // combined Drive-or-repo one, which no single validator file tests.
  it.each(Object.entries(LINK_RULES))("%s pattern compiles under the v flag", (_kind, rule) => {
    expect(() => new RegExp(`^(?:${rule.pattern})$`, "v")).not.toThrow();
  });
});

describe("setTitle", () => {
  const cadSet = QUESTION_SETS.find((s) => s.domains.includes("Robotics"));

  it("names only the selected domains, or all of them with no selection", () => {
    expect(cadSet && setTitle(cadSet, ["Robotics"])).toBe("Robotics");
    expect(cadSet && setTitle(cadSet)).toBe("Automotives & Robotics");
  });
});

/**
 * S82B: the fixed domain order and the merged Operations & Sponsorship domain.
 * Everything on /join and in the admin derives from JOIN_DOMAINS, so pinning
 * the list pins every consumer.
 */
describe("JOIN_DOMAINS -- one ordered list", () => {
  it("is exactly the five domains, in the fixed order", () => {
    expect(JOIN_DOMAINS.map((d) => d.label)).toEqual([
      "Automotives",
      "Robotics",
      "Coding",
      "Design & Social Media",
      "Operations & Sponsorship",
    ]);
    expect(DOMAINS).toEqual(["Automotives", "Robotics", "Coding", "Social Media", OS]);
  });

  it("groups the test track first, then the interview track", () => {
    expect(TRACKS).toEqual(["test", "interview"]);
    const byTrack = (t: string) => JOIN_DOMAINS.filter((d) => d.track === t).map((d) => d.label);
    expect(byTrack("test")).toEqual(["Automotives", "Robotics", "Coding"]);
    expect(byTrack("interview")).toEqual(["Design & Social Media", "Operations & Sponsorship"]);
  });

  it("orders question sets by their first domain, with branch sub-headings on the merged two", () => {
    expect(QUESTION_SETS.map((s) => setTitle(s))).toEqual([
      "Automotives & Robotics",
      "Coding",
      "Design & Social Media",
      "Operations & Sponsorship",
    ]);
    const headings = (id: string) =>
      QUESTION_SETS.find((s) => s.id === id)?.branches.map((b) => b.heading ?? null);
    expect(headings("dsm")).toEqual([null, "Social Media", "Design"]);
    expect(headings("ops_spon")).toEqual(["Operations / Logistics", "Sponsorship"]);
  });

  it("keeps every S81 answer id", () => {
    const ids = QUESTION_SETS.flatMap((s) => s.branches.flatMap((b) => b.questions.map((q) => q.id)));
    for (const id of ["ops_running_events", "ops_experience", "spon_experience", "dsm_tracks", "cad_auto_link", "code_profile_link"]) {
      expect(ids).toContain(id);
    }
  });
});

describe("domain display -- old keys read as the merged domain", () => {
  it("labels pre-S82B Operations / Sponsorship as Operations & Sponsorship", () => {
    expect(domainLabel("Operations")).toBe(OS);
    expect(domainLabel("Sponsorship")).toBe(OS);
    expect(domainLabel("Social Media")).toBe("Design & Social Media");
    expect(domainLabel("Programming")).toBe("Programming"); // FY25 passes through
  });

  it("orders an application's domains and collapses an old Operations + Sponsorship pair", () => {
    expect(orderedDomainLabels(["Sponsorship", "Coding", "Operations"])).toEqual(["Coding", OS]);
    expect(orderedDomainLabels([OS, null, "Automotives"])).toEqual(["Automotives", OS]);
  });

  it("sorts submitted picks into JOIN_DOMAINS order regardless of click order", () => {
    expect(sortDomains([OS, "Coding", "Automotives"])).toEqual(["Automotives", "Coding", OS]);
  });
});
