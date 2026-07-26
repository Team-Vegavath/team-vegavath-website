/**
 * Generates a URL-friendly slug from a string.
 * Example: "EmbedX 2.0" → "embedx-2-0"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Formats a date string to DD/MM/YYYY display format.
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formats a date string to readable format.
 * Example: "November 2025"
 */
export function formatDateLong(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Constructs a full R2 public URL from a path.
 */
export function r2Url(path: string): string {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
  return `${base}/${path}`;
}

/**
 * Returns true if a string is a valid URL.
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns true if a string is a valid email address.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Strips markdown syntax so body copy can be reused in plain-text contexts
 * (JSON-LD description fields, meta descriptions, list excerpts).
 * Lives here rather than in a page because both events and posts need it.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/\n{2,}/g, " ")
    .trim();
}

const NO_REGISTRATION_PREFIXES = ["bootstrap-", "freshers-day-"];
const NO_REGISTRATION_EXACT = new Set<string>([]);

export function isNoRegistrationEvent(slug: string): boolean {
  if (NO_REGISTRATION_EXACT.has(slug)) return true;
  return NO_REGISTRATION_PREFIXES.some(prefix => slug.startsWith(prefix));
}