/**
 * What the forms put in the HTML `pattern` attribute (implicitly anchored):
 * ten digits, optionally prefixed with +91 / 91 / 0 and one separator. Kept
 * beside normalisePhone so the browser check and the API check stay in step.
 * This module is pure -- client components may import it.
 */
export const PHONE_PATTERN = "(\\+?91[\\s-]?|0)?[0-9]{10}";

/**
 * Normalise a phone input to 10 digits.
 * Strips +91, country code 91, a leading trunk 0, spaces, hyphens, parentheses.
 * Returns null if the result is not exactly 10 digits.
 */
export function normalisePhone(input: string): string | null {
  let digits = input.replace(/\D/g, ""); // keep only digits
  // Strip leading 91 if 12 digits (country code)
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }
  // Strip the domestic trunk prefix (011 98765..., 0 98765...) -- it is a
  // dialling prefix, not part of the number, so it must not count towards 10.
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (digits.length !== 10) return null;
  return digits;
}
