/**
 * S81: GitHub / GitLab link validation for /join -- the Coding profile link and
 * the Robotics project link. Same arrangement as driveLink.ts: each pattern
 * SOURCE feeds the HTML `pattern` attribute (compiled with the `v` flag, so
 * class hyphens are escaped and the test asserts `v` compilation), and the
 * matching function runs the same string on the server.
 *
 * The host is anchored exactly (github.com / gitlab.com, optional www.), so
 * lookalikes such as github.com.evil.com, github.com@evil.com, gist.github.com or
 * raw.githubusercontent.com never match. Only the FORMAT is checked (owner
 * decision, S81): a private repo's URL is indistinguishable from a public one
 * without asking GitHub, which would be a new egress point. The form tells the
 * applicant to keep the repo public.
 *
 * ponytail: site pages that share the profile shape (github.com/explore,
 * gitlab.com/explore/projects) still pass; a reviewer spots them on sight. A
 * reserved-name list goes here if that ever shows up in real submissions.
 */
const GITHUB = String.raw`https://(?:www\.)?github\.com`;
const GITLAB = String.raw`https://(?:www\.)?gitlab\.com`;
// GitHub user / org: alphanumerics with inner hyphens, at most 39 characters.
const GH_NAME = String.raw`[A-Za-z0-9](?:[A-Za-z0-9\-]{0,37}[A-Za-z0-9])?`;
const GH_REPO = String.raw`[A-Za-z0-9_.\-]+`;
// GitLab user / group / project path segment.
const GL_NAME = String.raw`[A-Za-z0-9_][A-Za-z0-9_.\-]*`;
// After a repo: any deeper path (tree/main/src, -/blob/...), query, fragment.
const DEEPER = String.raw`(?:/[^\s?#]*)?(?:[?#]\S*)?`;
// After a profile: optional trailing slash and query (?tab=repositories).
const PROFILE_END = String.raw`/?(?:[?#]\S*)?`;

/** A repository: github.com/<owner>/<repo>, or gitlab.com/<group>/.../<project>. */
export const CODE_REPO_PATTERN =
  `${GITHUB}/${GH_NAME}/${GH_REPO}${DEEPER}` +
  `|${GITLAB}/${GL_NAME}(?:/${GL_NAME})+${DEEPER}`;

/** A profile (github.com/<user>, gitlab.com/<user>) or any repository above. */
export const CODE_PROFILE_PATTERN =
  `${GITHUB}/${GH_NAME}${PROFILE_END}` +
  `|${GITLAB}/${GL_NAME}${PROFILE_END}` +
  `|${CODE_REPO_PATTERN}`;

const REPO_RE = new RegExp(`^(?:${CODE_REPO_PATTERN})$`);
const PROFILE_RE = new RegExp(`^(?:${CODE_PROFILE_PATTERN})$`);

// Same contract as isValidDriveLink: trims, and an empty value is valid --
// every link on /join is optional.
export function isValidCodeRepoLink(value: string): boolean {
  const v = value.trim();
  return v === "" || REPO_RE.test(v);
}

export function isValidCodeProfileLink(value: string): boolean {
  const v = value.trim();
  return v === "" || PROFILE_RE.test(v);
}
