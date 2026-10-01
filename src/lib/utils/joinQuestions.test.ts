import { describe, expect, it } from "vitest";

import { GENERAL_QUESTIONS, LINK_RULES, parseJoinAnswers, setTitle, QUESTION_SETS } from "./joinQuestions";

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
    expect(parseJoinAnswers(rest, ["Sponsorship"])).toHaveProperty("error");
  });

  it("drops a deselected domain's answers and ignores unknown keys", () => {
    const answers = ok({ ...general, ops_experience: "ran a fest", injected: "x" }, ["Sponsorship"]);
    expect(answers).toEqual(general);
  });

  it("enforces each selected set's required answers", () => {
    expect(parseJoinAnswers(general, ["Operations"])).toHaveProperty("error");
    expect(parseJoinAnswers(general, ["Coding"])).toHaveProperty("error");
    expect(parseJoinAnswers(general, ["Robotics"])).toHaveProperty("error");
    expect(parseJoinAnswers(general, ["Sponsorship"])).toHaveProperty("answers"); // all optional
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
    for (const lazy of [".", "idk", "no", "123456789"]) {
      expect(parseJoinAnswers({ ...general, general_why_vegavath: lazy }, ["Sponsorship"]))
        .toHaveProperty("error");
      expect(parseJoinAnswers({ ...general, spon_experience: lazy }, ["Sponsorship"]))
        .toHaveProperty("error");
    }
    // Exactly 10 passes; padding does not count, because the server trims.
    expect(ok({ ...general, spon_experience: "1234567890" }, ["Sponsorship"]))
      .toHaveProperty("spon_experience", "1234567890");
    expect(parseJoinAnswers({ ...general, spon_experience: "   idk      " }, ["Sponsorship"]))
      .toHaveProperty("error");
    // An optional answer can still be left empty, and "No experience" clears the bar.
    expect(ok({ ...general, spon_experience: "" }, ["Sponsorship"])).not.toHaveProperty("spon_experience");
    expect(ok({ ...general, spon_experience: "No experience" }, ["Sponsorship"]))
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
    const long = { ...general, general_why_vegavath: "x".repeat(2001) };
    expect(parseJoinAnswers(long, ["Sponsorship"])).toHaveProperty("error");
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
