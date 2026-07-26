import Link from "next/link";

// S52B: DPDP Act 2023 §5 notice. Sits directly under the submit button on
// every form that collects personal data. One component rather than four
// inlined copies so the legal wording only ever exists in one place.
// No "use client" - this is presentational, so it drops into client and
// server trees alike.
// `color` exists because the /bootstrap subtree uses its own BS palette, where
// the site's --text-muted (#555) is too dark to read. The link needs no
// override: .legal-link resolves to --accent (#EF5D08), which is the same value
// as BS.accent.
export function ConsentNotice({ color = "var(--text-muted)" }: { color?: string }) {
  return (
    <p
      className="mono"
      style={{
        fontSize: "0.72rem",
        lineHeight: 1.6,
        color,
        marginTop: "0.75rem",
      }}
    >
      By submitting, you agree to our{" "}
      <Link href="/legal" className="legal-link">
        Privacy Policy
      </Link>
      .
    </p>
  );
}
