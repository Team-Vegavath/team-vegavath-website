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

/** Vercel rejects a serverless request body over roughly 4.5 MB before the route
 *  runs. 4 MB leaves room for the multipart envelope and the `path` field, which
 *  ride along with the file in the same body. */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/**
 * S76D: the single upload path for every admin form. Previously five components
 * carried a copy-pasted version of this, and all five called res.json() BEFORE
 * checking res.ok.
 *
 * /api/admin/upload proxies the raw file through a Vercel serverless function,
 * which rejects bodies over roughly 4.5 MB with a PLAIN-TEXT "Request Entity Too
 * Large" -- the route never runs, so nothing turns it into JSON. Parsing that as
 * JSON is what produced the reported
 * `Unexpected token 'R', "Request En"... is not valid JSON`, which named the
 * parser rather than the actual problem.
 *
 * Reads the body as text and tries to parse it, rather than trusting the
 * content-type header: one mechanism that also covers a JSON body served under
 * the wrong content-type, instead of two doing the same job.
 *
 * ponytail: this surfaces the size limit, it does not raise it. Files above the
 * limit still fail, they just fail immediately and legibly. Presigned
 * direct-to-R2 uploads are the real fix and are deferred to a future session.
 */
export async function uploadToR2(file: File, path: string): Promise<string> {
  // Fail before spending the upload. A phone HDR capture is routinely 4-6 MB, so
  // this is the common case, not an edge case, and the round trip would only end
  // in a plain-text 413 anyway. The status check below stays as the backstop for
  // whatever slips past this bound.
  if (file.size > MAX_UPLOAD_BYTES) {
    const size = (file.size / 1024 / 1024).toFixed(1);
    throw new Error(
      `${file.name} is ${size} MB, over the 4 MB upload limit. Try compressing it first, or resize it to around 2000px on the long edge.`
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("path", path);

  const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
  const body = await res.text();

  let data: { url?: string; error?: string } | null = null;
  try {
    data = JSON.parse(body) as { url?: string; error?: string };
  } catch {
    // Not JSON. An infrastructure-level rejection, not an application response.
  }

  if (!res.ok) {
    const detail = data?.error ?? body.trim().slice(0, 200);
    const size = (file.size / 1024 / 1024).toFixed(1);
    const hint =
      res.status === 413
        ? ` -- ${file.name} is ${size} MB and the upload limit is about 4.5 MB.`
        : "";
    throw new Error(`Upload failed (HTTP ${res.status}): ${detail || res.statusText}${hint}`);
  }

  if (!data?.url) {
    throw new Error(`Upload returned no URL (HTTP ${res.status}).`);
  }
  return data.url;
}
