/**
 * Normalise a phone input to 10 digits.
 * Strips +91, country code 91, spaces, hyphens, parentheses.
 * Returns null if the result is not exactly 10 digits.
 */
export function normalisePhone(input: string): string | null {
  let digits = input.replace(/\D/g, ""); // keep only digits
  // Strip leading 91 if 12 digits (country code)
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }
  if (digits.length !== 10) return null;
  return digits;
}
