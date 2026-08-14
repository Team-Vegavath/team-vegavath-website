import Image from "next/image";
import Link from "next/link";

import type { Announcement } from "@/types/announcement";

/* S73E. Server component by design (73A-2 decision 11): a single active slot,
   no rotation, so there is nothing to make this interactive. The page renders
   it only when getActiveAnnouncement() returned a row, so there is no empty
   state to handle here.

   Type-only import, no service import -- this renders on the server but the
   rule costs nothing to keep. */

type Props = {
  announcement: Announcement;
};

export function AnnouncementBanner({ announcement }: Props) {
  const { title, body, image_url_desktop, image_url_mobile, cta_label, cta_href } =
    announcement;

  // Both crops present: real @media toggle, per StallCard's scoped-<style>
  // precedent. Tailwind responsive prefixes lose to the unlayered rules in
  // globals.css, which is why this is a style tag and not `hidden md:block`.
  const hasBothCrops = Boolean(image_url_desktop && image_url_mobile);
  // Exactly one crop: show it at every width rather than leaving a blank band
  // on the other breakpoint. Costs one ternary and removes the "mobile-only
  // image looks broken on desktop" failure.
  const soleCrop = hasBothCrops ? null : image_url_desktop ?? image_url_mobile;

  const hasCta = Boolean(cta_label && cta_href);

  return (
    <section
      style={{
        padding: "3.5rem 1.5rem",
        // Surface + a top and bottom rule: reads as a distinct band against the
        // speed-lines pattern above and below without inventing a new treatment.
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {hasBothCrops ? (
        <style>{`
          .announcement-img-mobile { display: block; }
          .announcement-img-desktop { display: none; }
          @media (min-width: 768px) {
            .announcement-img-mobile { display: none; }
            .announcement-img-desktop { display: block; }
          }
        `}</style>
      ) : null}

      <div className="mx-auto" style={{ maxWidth: "72rem" }}>
        <p className="label-tech" style={{ marginBottom: "0.75rem", color: "var(--accent)" }}>
          Announcement
        </p>

        <h2
          className="heading"
          style={{
            fontSize: "clamp(1.6rem, 4vw, 2.6rem)",
            fontWeight: 700,
            textTransform: "uppercase",
            lineHeight: 1.1,
          }}
        >
          {title}
        </h2>

        {body ? (
          <p
            style={{
              marginTop: "1rem",
              maxWidth: "48rem",
              color: "var(--text-secondary)",
              fontSize: "1rem",
              lineHeight: 1.7,
              whiteSpace: "pre-line",
            }}
          >
            {body}
          </p>
        ) : null}

        {hasBothCrops ? (
          <div style={{ marginTop: "2rem" }}>
            <Image
              className="announcement-img-desktop"
              src={image_url_desktop as string}
              alt={title}
              width={2400}
              height={800}
              sizes="(max-width: 767px) 1px, 100vw"
              style={{ width: "100%", height: "auto" }}
            />
            <Image
              className="announcement-img-mobile"
              src={image_url_mobile as string}
              alt={title}
              width={800}
              height={1000}
              sizes="(min-width: 768px) 1px, 100vw"
              style={{ width: "100%", height: "auto" }}
            />
          </div>
        ) : soleCrop ? (
          <div style={{ marginTop: "2rem" }}>
            <Image
              src={soleCrop}
              alt={title}
              width={2400}
              height={1000}
              sizes="100vw"
              style={{ width: "100%", height: "auto" }}
            />
          </div>
        ) : null}

        {/* Half a CTA renders nothing: a labelled button with no destination, or
            a link with no label, is worse than no button. */}
        {hasCta ? (
          <div style={{ marginTop: "2rem" }}>
            <Link href={cta_href as string} className="btn-primary">
              {cta_label}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
