import Image from "next/image";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import type { Sponsor } from "@/types/sponsor";

interface SponsorMarqueeProps {
  sponsors: Sponsor[];
}

export function SponsorMarquee({ sponsors }: SponsorMarqueeProps) {
  if (sponsors.length === 0) return null;

  return (
    // overflow: hidden was already here; only position: relative is new, so the
    // two edge fades below have something to anchor to.
    <div style={{ position: "relative", overflow: "hidden", padding: "1.5rem 0" }}>
      <div className="marquee-track">
        {[...sponsors, ...sponsors].map((sponsor, index) => {
          const logo = (
            <Image
              src={sponsor.logo_url}
              alt={sponsor.name}
              width={160}
              height={48}
              className="marquee-logo"
              unoptimized // small logo, no WebP/multi-size benefit
            />
          );

          return sponsor.website_url ? (
            <a
              key={`${sponsor.id}-${index}`}
              href={sponsor.website_url}
              target="_blank"
              rel="noreferrer"
              aria-label={sponsor.name}
              style={{ display: "inline-flex" }}
            >
              {logo}
            </a>
          ) : (
            <span key={`${sponsor.id}-${index}`} style={{ display: "inline-flex" }}>
              {logo}
            </span>
          );
        })}
      </div>

      {/* Edge fades so logos dissolve instead of hard-cutting at the clip.
          Default blurLevels is 4 layers, not upstream's 8 -- each layer is a
          real backdrop-filter and this strip is on / and /about. */}
      <ProgressiveBlur position="left" height="120px" />
      <ProgressiveBlur position="right" height="120px" />
    </div>
  );
}
