import type { ChangeEvent } from "react";

/** Every phone field in the project holds exactly this many digits. */
export const PHONE_MAX_DIGITS = 10;

/**
 * What the forms put in the HTML `pattern` attribute (implicitly anchored):
 * ten digits, optionally prefixed with +91 / 91 / 0 and one separator. Kept
 * beside normalisePhone so the browser check and the API check stay in step.
 * This module is pure -- client components may import it.
 *
 * S73I: every phone field is now maxLength={10} and instructs bare 10 digits,
 * so the prefix branches here (and in normalisePhone) are unreachable from our
 * own forms. They stay as a TOLERANT FALLBACK for pasted or programmatic input,
 * deliberately a superset of what the UI asks for -- not the instructed shape.
 *
 * S76B: the hyphen in the separator class is ESCAPED, and that is load-bearing.
 * It was `[\s-]`, which is a syntax error under the RegExp `v` flag: a `-`
 * directly after a class escape is an invalid character class there. The HTML
 * spec compiles `pattern` with `v`, and a pattern that throws is IGNORED
 * ENTIRELY -- the field then reports valid for literally any value, letters
 * included. That is a silent, total loss of client-side validation on all five
 * fields that use this constant, and it looks exactly like the field "never had
 * validation wired up". `[\s\-]` compiles under u AND v and matches the same
 * characters. There is a test pinning this; do not unescape it.
 */
export const PHONE_PATTERN = "(\\+?91[\\s\\-]?|0)?[0-9]{10}";

/**
 * Strip everything that is not a digit and cap at 10.
 *
 * S76B: this is the layer that was missing everywhere. `maxLength` caps the
 * COUNT of characters, not their type, and `pattern` only runs at form submit --
 * and not at all on the two volunteer editors, which have no <form> around them.
 * Neither stops a letter appearing in the field as it is typed. This does, by
 * construction: the value in React state can never be anything but 0-10 digits,
 * so there is no path by which a non-digit reaches the request body.
 */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, PHONE_MAX_DIGITS);
}

/**
 * onChange wrapper for a phone input: filters the keystroke, then hands the
 * clean value to whatever setter the component already uses.
 *
 *   onChange={onDigitsChange(setPhone)}
 *
 * A helper rather than seven copies of the same inline arrow, so the cap and the
 * filter are stated once. Takes a plain `(digits: string) => void` instead of a
 * React state setter so it also fits the components whose state is one object
 * (`setForm(prev => ...)`) rather than a bare string.
 */
export function onDigitsChange(set: (digits: string) => void) {
  return (e: ChangeEvent<HTMLInputElement>) => set(digitsOnly(e.target.value));
}

/**
 * Normalise a phone input to 10 digits.
 * Strips +91, country code 91, a leading trunk 0, spaces, hyphens, parentheses.
 * Returns null if the result is not exactly 10 digits.
 */
export function normalisePhone(input: string): string | null {
  // S76B: `String(input ?? "")` rather than `input.replace(...)` so a null or
  // undefined degrades to "" -> null instead of throwing a TypeError. All EIGHT
  // callers coerce their input already (re-verified in S76B, one by one), so
  // this is unreachable today and is defensive only. The parameter type stays
  // `string` deliberately: this is "do not crash if it ever happens", not an
  // invitation for callers to start passing nullable values.
  let digits = String(input ?? "").replace(/\D/g, ""); // keep only digits
  // Strip leading 91 if 12 digits (country code)
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }
  // Strip the domestic trunk prefix (011 98765..., 0 98765...) -- it is a
  // dialling prefix, not part of the number, so it must not count towards 10.
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (digits.length !== PHONE_MAX_DIGITS) return null;
  return digits;
}
