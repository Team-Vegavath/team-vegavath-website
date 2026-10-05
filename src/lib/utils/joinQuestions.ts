import type { ApplicationDomain, JoinAnswers } from "@/types/settings";

import {
  CODE_PROFILE_PATTERN,
  CODE_REPO_PATTERN,
  isValidCodeProfileLink,
  isValidCodeRepoLink,
} from "./codeHostLink";
import { DRIVE_LINK_PATTERN, isValidDriveLink } from "./driveLink";

/**
 * S81: every question on /join pages 3 and 4, defined ONCE. JoinClient renders
 * from these definitions and /api/join validates against them, so a required
 * flag, a max length, an option list or a show/hide rule cannot differ between
 * the two sides. `visibleQuestions` is the single walk both sides use to decide
 * what is on screen.
 *
 * Answers are stored in `applications.answers` (JSONB, migration 030) keyed by
 * `id`. Ids are stable on purpose: the wording will change, the ids must not,
 * or old answers stop lining up with their questions. Pure module -- client
 * components may import it.
 */

export const COURSES = ["B.Tech CSE", "B.Tech AIML", "B.Tech ECE", "BBA", "Other"] as const;

export type Track = "test" | "interview";
export type SetId = "cad" | "code" | "dsm" | "ops_spon";

/**
 * S82B: THE ordered list of /join domains. This order is the order everywhere:
 * the page 2 tiles, the brand panel, the Recruitment Process block, the page 4
 * question sets, the admin view and the export. Nothing else may restate it.
 *
 * - `key` is the STORED value (/api/join, the CHECKs in migration 031). S81
 *   relabelled Social Media without touching what is stored; S82B merged
 *   Operations and Sponsorship under a new key (old keys: MERGED_FROM).
 * - `track` picks the Recruitment Process stages (TRACK_STAGES).
 * - `set` is the page 4 question set. Automotives and Robotics share one (both
 *   work on CAD). The two merged domains' branch sub-headings live inside their
 *   set (SET_BRANCHES), the one place they are defined.
 */
export const JOIN_DOMAINS: readonly {
  key: ApplicationDomain;
  label: string;
  track: Track;
  set: SetId;
}[] = [
  { key: "Automotives", label: "Automotives", track: "test", set: "cad" },
  { key: "Robotics", label: "Robotics", track: "test", set: "cad" },
  { key: "Coding", label: "Coding", track: "test", set: "code" },
  { key: "Social Media", label: "Design & Social Media", track: "interview", set: "dsm" },
  { key: "Operations & Sponsorship", label: "Operations & Sponsorship", track: "interview", set: "ops_spon" },
];

/** The stored keys /api/join accepts, in order. */
export const DOMAINS: readonly ApplicationDomain[] = JOIN_DOMAINS.map((d) => d.key);

export const TRACK_STAGES: Record<Track, readonly string[]> = {
  test: ["Application Form", "Domain-Specific Test", "Interview"],
  interview: ["Application Form", "Interview"],
};

/** Tracks in the order their first domain appears: test, then interview. */
export const TRACKS: readonly Track[] = [...new Set(JOIN_DOMAINS.map((d) => d.track))];

// Stored values from before S82B that now belong to a merged domain. Rows are
// never rewritten; they are read as the merged domain wherever domains show.
const MERGED_FROM: Record<string, ApplicationDomain> = {
  Operations: "Operations & Sponsorship",
  Sponsorship: "Operations & Sponsorship",
};

const asCurrent = (value: string) => MERGED_FROM[value] ?? value;

// Position in JOIN_DOMAINS; anything unknown (FY25 legacy) sorts after.
const rank = (value: string) => {
  const i = JOIN_DOMAINS.findIndex((d) => d.key === asCurrent(value));
  return i === -1 ? JOIN_DOMAINS.length : i;
};

/** Label for any stored domain value; FY25 legacy values pass through as-is. */
export function domainLabel(value: string): string {
  return JOIN_DOMAINS.find((d) => d.key === asCurrent(value))?.label ?? value;
}

/** The given domain values in JOIN_DOMAINS order (stable for unknowns). */
export function sortDomains<T extends string>(values: readonly T[]): T[] {
  return [...values].sort((a, b) => rank(a) - rank(b));
}

/**
 * An application's stored domain columns as display labels: in JOIN_DOMAINS
 * order, empties dropped, and an old Operations + Sponsorship pair collapsed
 * into one "Operations & Sponsorship".
 */
export function orderedDomainLabels(values: readonly (string | null | undefined)[]): string[] {
  const present = values.filter((v): v is string => Boolean(v));
  return [...new Set(sortDomains(present).map(domainLabel))];
}

export const LONG_ANSWER_MAX = 2000;
// S81 (owner): a speed bump against "." / "idk". Applies to every written answer
// that is filled in; an optional one may still be left empty. Not applied to the
// short "Other" boxes, where "Podcasts" is a complete answer.
export const MIN_ANSWER = 10;
export const SHORT_ANSWER_MAX = 200;
export const LINK_MAX = 500;

/**
 * `showIf`: the question is shown only while the multi-select `id` (earlier in
 * the same set) has `includes` ticked -- the Design / Social Media split and the
 * Automotives / Robotics link boxes. A hidden question is never required, and
 * its answer is dropped on submit, on both sides.
 */
type Conditional = { showIf?: { id: string; includes: string } };

// Links have no `required` field at all: every link on the form is optional.
export type Question = Conditional &
  (
    | { id: string; kind: "text"; label: string; help?: string; required: boolean }
    | {
        id: string;
        kind: "multi";
        label: string;
        help?: string;
        options: readonly string[];
        required: boolean;
        /** Ticking "Other" reveals a required short text answer stored under this id. */
        otherId?: string;
        /** Options are domain values; only the domains the applicant picked are offered. */
        domainOptions?: boolean;
      }
    | { id: string; kind: LinkKind; label: string; help?: string }
  );

/** Link field types; each one's browser pattern and server check live in LINK_RULES. */
export type LinkKind = "drive" | "url" | "drive_or_repo" | "code_profile";

type MultiQuestion = Extract<Question, { kind: "multi" }>;

export const isLinkQuestion = (q: Question) => q.kind in LINK_RULES;

const DRIVE_HELP =
  "Paste a Google Drive link. Set sharing to 'Anyone with the link' so we can open it.";

// S81: the "If not, enter None" instruction lives here as a gentle help line
// rather than as an order at the end of each question (owner: soften the form).
// Reviewers still get an explicit "None" instead of a blank.
// "No experience" rather than "None": it has to clear MIN_ANSWER itself.
const NONE_HELP = 'No experience yet? That\'s completely fine, just write "No experience".';

export const GENERAL_QUESTIONS: readonly Question[] = [
  {
    id: "general_why_vegavath",
    kind: "text",
    required: true,
    label: "What made you apply to Vegavath specifically?",
    help: "What interests you about the team or the kind of work we do?",
  },
  {
    id: "general_outside_work",
    kind: "text",
    required: true,
    label:
      "Tell us about something you've worked on outside of academics that you genuinely enjoyed.",
    help: "It could be a project, competition, event, hobby, technical work, creative work, or anything else you've been involved in.",
  },
  {
    id: "general_valuable_skill",
    kind: "text",
    required: true,
    label:
      "What is one skill or quality you have that you believe would be valuable to Vegavath?",
    help: "Tell us about a situation or experience where you've demonstrated or used it.",
  },
  {
    id: "general_learn_this_year",
    kind: "text",
    required: true,
    label:
      "If you join Vegavath, what is something you genuinely want to learn, experience, or accomplish this year?",
  },
];

const DESIGN = { id: "dsm_tracks", includes: "Design" };
const SOCIAL = { id: "dsm_tracks", includes: "Social Media" };

/** A run of questions inside a set, under an optional branch sub-heading. */
export interface Branch {
  heading?: string;
  questions: readonly Question[];
}

/**
 * Page 4 question sets, by id. Each set is a list of branches; the two merged
 * domains (Design & Social Media, Operations & Sponsorship) use headed branches
 * so their halves read as sub-sections of ONE set. Applicants never pick a
 * branch on page 2 -- they are layout. (Design & Social Media still asks which
 * half the applicant wants, inside the set, as S81 decided.)
 *
 * Automotives and Robotics share "cad", but each keeps its OWN link key so the
 * links can be grouped by domain later.
 */
const SET_BRANCHES: Record<SetId, readonly Branch[]> = {
  cad: [
    {
      questions: [
        {
          id: "cad_experience",
          kind: "text",
          required: true,
          label:
            "Have you worked on any automotive or robotics projects, or used CAD, simulation software, or similar tools? Tell us about it.",
          help: NONE_HELP,
        },
        {
          id: "cad_link_for",
          kind: "multi",
          required: false,
          domainOptions: true,
          label: "Do you have a project to share?",
          help: "Tick the domain it belongs to and a link box appears for it.",
          options: ["Automotives", "Robotics"],
        },
        {
          id: "cad_auto_link",
          kind: "drive",
          showIf: { id: "cad_link_for", includes: "Automotives" },
          label: "Automotives project (CAD / Fusion) - Drive Link",
          help: DRIVE_HELP,
        },
        {
          id: "cad_robotics_link",
          kind: "drive_or_repo",
          showIf: { id: "cad_link_for", includes: "Robotics" },
          label: "Robotics project - Drive, GitHub or GitLab Link",
          help: "Paste a Google Drive link, or a GitHub / GitLab repository. Please keep it public ('Anyone with the link' for Drive, a public repo for GitHub / GitLab) so we can open it.",
        },
      ],
    },
  ],
  code: [
    {
      questions: [
        {
          id: "code_experience",
          kind: "text",
          required: true,
          label:
            "What coding experience do you have? Mention any projects, languages, or tools you've worked with.",
          help: NONE_HELP,
        },
        {
          id: "code_profile_link",
          kind: "code_profile",
          label: "GitHub or GitLab profile link",
          help: "Your profile or a repository, for example https://github.com/your-username",
        },
      ],
    },
  ],
  dsm: [
    {
      questions: [
        {
          id: "dsm_tracks",
          kind: "multi",
          required: true,
          label: "Which part of Design & Social Media do you want to work on?",
          help: "Tick one or both. The questions below follow your choice.",
          // S82B: Social Media first, matching the branch order below.
          options: ["Social Media", "Design"],
        },
      ],
    },
    {
      heading: "Social Media",
      questions: [
        {
          id: "dsm_content_types",
          kind: "text",
          required: true,
          showIf: SOCIAL,
          label: "What type of content do you think would work well for a racing/robotics team?",
        },
        {
          id: "dsm_instagram_idea",
          kind: "text",
          required: true,
          showIf: SOCIAL,
          label:
            "Share one content idea for Vegavath that you'd genuinely like to see on Instagram.",
        },
        {
          id: "dsm_comfortable_with",
          kind: "multi",
          required: true,
          showIf: SOCIAL,
          label: "Which are you comfortable with?",
          options: ["Content Writing", "Photography", "Videography", "Reels", "Other"],
          otherId: "dsm_comfortable_other",
        },
        {
          id: "dsm_experience",
          kind: "text",
          required: true,
          showIf: SOCIAL,
          label:
            "Have you managed a social media page, created content, edited videos, or done any digital marketing before? Tell us about it.",
          help: NONE_HELP,
        },
        {
          id: "dsm_portfolio_link",
          kind: "url",
          showIf: SOCIAL,
          label: "Portfolio / Instagram / previous work link",
        },
      ],
    },
    {
      heading: "Design",
      questions: [
        {
          id: "dsm_design_types",
          kind: "multi",
          required: true,
          showIf: DESIGN,
          label: "What type of design do you work with?",
          options: ["Posters", "Branding", "UI/UX", "Photo Editing", "Video"],
        },
        {
          id: "dsm_portfolio_drive",
          kind: "drive",
          showIf: DESIGN,
          label: "Design Portfolio - Drive Link",
          help: DRIVE_HELP,
        },
        {
          id: "dsm_portfolio_piece",
          kind: "text",
          required: false,
          showIf: DESIGN,
          label:
            "Tell us about one piece in your portfolio that you're particularly proud of and why.",
        },
      ],
    },
  ],
  ops_spon: [
    {
      heading: "Operations / Logistics",
      questions: [
        {
          id: "ops_running_events",
          kind: "text",
          required: true,
          label:
            "What do you think is the most important part of successfully running a team/event? Why?",
        },
        {
          id: "ops_experience",
          kind: "text",
          required: true,
          label:
            "Have you ever organised or helped manage an event or project? Tell us briefly what you were responsible for.",
          help: NONE_HELP,
        },
      ],
    },
    {
      heading: "Sponsorship",
      questions: [
        {
          id: "spon_experience",
          kind: "text",
          required: false,
          label:
            "Have you ever been involved in sponsorships, fundraising, partnerships, sales, outreach, or reaching out to companies or organisations for support? Tell us what you did and what your role was.",
          help: NONE_HELP,
        },
      ],
    },
  ],
};

export interface QuestionSet {
  id: SetId;
  /** Every domain pointing at this set, in JOIN_DOMAINS order. */
  domains: readonly ApplicationDomain[];
  branches: readonly Branch[];
}

/** One entry per set, in the order its first domain appears in JOIN_DOMAINS. */
export const QUESTION_SETS: readonly QuestionSet[] = [...new Set(JOIN_DOMAINS.map((d) => d.set))].map(
  (id) => ({
    id,
    domains: JOIN_DOMAINS.filter((d) => d.set === id).map((d) => d.key),
    branches: SET_BRANCHES[id],
  })
);

/** A set's questions, branches flattened, in order. */
export const setQuestions = (set: { branches: readonly Branch[] }): Question[] =>
  set.branches.flatMap((b) => b.questions);

/**
 * A set's title: its domains' labels joined with " & ". Pass the selected
 * domains to name only those ("Robotics" rather than "Automotives & Robotics"
 * for a Robotics-only applicant); omit them for the full title.
 */
export function setTitle(set: QuestionSet, selected?: readonly string[]): string {
  return set.domains
    .filter((d) => !selected || selected.includes(d))
    .map(domainLabel)
    .join(" & ");
}

/** Sets with at least one selected domain, in JOIN_DOMAINS order. */
export function setsFor(domains: readonly string[]): QuestionSet[] {
  return QUESTION_SETS.filter((s) => s.domains.some((d) => domains.includes(d)));
}

/**
 * Every question set with its full title and branches, General first -- for the
 * admin detail view (which shows the branch sub-headings) and the export.
 */
export const QUESTION_GROUPS: { title: string; branches: readonly Branch[] }[] = [
  { title: "General", branches: [{ questions: GENERAL_QUESTIONS }] },
  ...QUESTION_SETS.map((s) => ({ title: setTitle(s), branches: s.branches })),
];

/** The options a multi-select actually offers, given the selected domains. */
export function optionsFor(q: MultiQuestion, domains: readonly string[]): readonly string[] {
  return q.domainOptions ? q.options.filter((o) => domains.includes(o)) : q.options;
}

/** What is effectively ticked: the sent values, filtered through what is offered. */
export function pickedOptions(q: MultiQuestion, domains: readonly string[], sent: unknown): string[] {
  return Array.isArray(sent) ? optionsFor(q, domains).filter((o) => sent.includes(o)) : [];
}

/**
 * The questions on screen, in order: the general questions, then the selected
 * domains' sets, minus any whose `showIf` is not met. One walk shared by the
 * form (what to render and require), the submit payload, and the server.
 */
export function visibleQuestions(
  domains: readonly string[],
  answers: Readonly<Record<string, unknown>>
): Question[] {
  const shown: Question[] = [];
  const ticked = new Map<string, string[]>();
  for (const q of [...GENERAL_QUESTIONS, ...setsFor(domains).flatMap(setQuestions)]) {
    if (q.showIf && !(ticked.get(q.showIf.id) ?? []).includes(q.showIf.includes)) continue;
    shown.push(q);
    if (q.kind === "multi") ticked.set(q.id, pickedOptions(q, domains, answers[q.id]));
  }
  return shown;
}

// Client side, the generic link input is type="url" plus this pattern, so the
// browser only ever accepts what isValidHttpsUrl accepts.
export const HTTPS_URL_PATTERN = String.raw`https://\S+`;

/** Same contract as isValidDriveLink: empty means "not given", never invalid. */
export function isValidHttpsUrl(value: string): boolean {
  const v = value.trim();
  if (v === "") return true;
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * One row per link type, read by BOTH sides: the form takes `pattern`,
 * `placeholder` and `hint` (for the tooltip), the server takes `isValid` and
 * `hint` (for the error). Every isValid treats empty as valid, so a combined
 * type is a plain OR. A new link type is one row here, not four edits.
 */
export const LINK_RULES: Record<
  LinkKind,
  { pattern: string; isValid: (v: string) => boolean; placeholder: string; hint: string }
> = {
  drive: {
    pattern: DRIVE_LINK_PATTERN,
    isValid: isValidDriveLink,
    placeholder: "https://drive.google.com/...",
    hint: "a Google Drive link",
  },
  url: {
    pattern: HTTPS_URL_PATTERN,
    isValid: isValidHttpsUrl,
    placeholder: "https://",
    hint: "a link starting with https://",
  },
  drive_or_repo: {
    pattern: `(?:${DRIVE_LINK_PATTERN})|(?:${CODE_REPO_PATTERN})`,
    isValid: (v) => isValidDriveLink(v) || isValidCodeRepoLink(v),
    placeholder: "https://drive.google.com/... or https://github.com/you/repo",
    hint: "a Google Drive link or a GitHub / GitLab repository link",
  },
  code_profile: {
    pattern: CODE_PROFILE_PATTERN,
    isValid: isValidCodeProfileLink,
    placeholder: "https://github.com/your-username",
    hint: "a GitHub or GitLab profile or repository link",
  },
};

/**
 * Server-side mirror of every client rule on pages 3 and 4. Only the visible
 * questions are read; anything else in `raw` (a deselected domain's answers, a
 * hidden Design / Social Media question, unknown keys) is dropped. An empty
 * link is accepted and simply omitted -- a missing link can never fail a
 * submission.
 */
export function parseJoinAnswers(
  raw: unknown,
  domains: readonly string[]
): { answers: JoinAnswers } | { error: string } {
  const input =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const answers: JoinAnswers = {};

  for (const q of visibleQuestions(domains, input)) {
    if (q.kind === "multi") {
      // Filtered through the offered options: drops unknown values, keeps canonical order.
      const picked = pickedOptions(q, domains, input[q.id]);
      if (q.required && picked.length === 0) {
        return { error: `Please pick at least one option for "${q.label}"` };
      }
      if (picked.length) answers[q.id] = picked;
      if (q.otherId && picked.includes("Other")) {
        const other = str(input[q.otherId]);
        if (!other) return { error: `Please tell us what "Other" means for "${q.label}"` };
        if (other.length > SHORT_ANSWER_MAX) {
          return { error: `Keep your "Other" choice under ${SHORT_ANSWER_MAX} characters` };
        }
        answers[q.otherId] = other;
      }
      continue;
    }

    const v = str(input[q.id]);
    if (q.kind === "text") {
      if (q.required && !v) return { error: `This one still needs an answer: "${q.label}"` };
      if (v && v.length < MIN_ANSWER) {
        return { error: `Please write a little more for "${q.label}" (at least ${MIN_ANSWER} characters).` };
      }
      if (v.length > LONG_ANSWER_MAX) {
        return { error: `Keep "${q.label}" under ${LONG_ANSWER_MAX} characters` };
      }
    } else {
      if (v.length > LINK_MAX) return { error: `"${q.label}" is too long` };
      const rule = LINK_RULES[q.kind];
      if (!rule.isValid(v)) {
        return { error: `"${q.label}" needs to be ${rule.hint}. You can also leave it empty.` };
      }
    }
    if (v) answers[q.id] = v;
  }

  return { answers };
}
