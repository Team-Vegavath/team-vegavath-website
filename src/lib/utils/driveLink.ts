/**
 * S81: Google Drive / Docs share-link validation for the optional portfolio and
 * CAD link fields on /join.
 *
 * ONE pattern source for both sides, the same arrangement as phone.ts and
 * srn.ts: the form feeds DRIVE_LINK_PATTERN straight into the HTML `pattern`
 * attribute, and /api/join runs isValidDriveLink on the same string.
 *
 * Browsers compile `pattern` with the RegExp `v` flag, and a pattern that fails
 * to compile is ignored outright (S76B). So every hyphen inside a character
 * class is escaped, and driveLink.test.ts asserts `v`-flag compilation.
 *
 * Only the FORMAT is checked. Whether the link actually opens cannot be: Drive
 * answers a private file with a login page, so no request from our side can
 * tell a private link from a public one. Pure module -- client components may
 * import it.
 */
const ID = String.raw`[A-Za-z0-9_\-]{10,}`;
const QUERY = String.raw`(?:\?[^\s#]*)?`;

export const DRIVE_LINK_PATTERN =
  String.raw`https://(?:drive\.google\.com/(?:` +
  String.raw`file/d/${ID}(?:/(?:view|edit|preview))?/?${QUERY}` +
  String.raw`|drive/(?:u/[0-9]+/)?folders/${ID}/?${QUERY}` +
  String.raw`|open\?id=${ID}(?:&[^\s#]*)?` +
  String.raw`)|docs\.google\.com/(?:document|spreadsheets|presentation)/d/${ID}(?:/[A-Za-z]+)?/?${QUERY}` +
  String.raw`)(?:#\S*)?`;

const DRIVE_LINK_RE = new RegExp(`^(?:${DRIVE_LINK_PATTERN})$`);

/**
 * True for a well-formed Drive / Docs share link, and ALSO true for an empty or
 * whitespace-only value: every link field on /join is optional, so "nothing
 * entered" must never read as invalid. Callers need no separate empty check.
 */
export function isValidDriveLink(value: string): boolean {
  const v = value.trim();
  return v === "" || DRIVE_LINK_RE.test(v);
}
