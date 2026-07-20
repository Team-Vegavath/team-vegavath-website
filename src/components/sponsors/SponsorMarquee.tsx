import Image from "next/image";
import type { Sponsor } from "@/types/sponsor";

interface SponsorMarqueeProps {
  sponsors: Sponsor[];
}

export function SponsorMarquee({ sponsors }: SponsorMarqueeProps) {
  if (sponsors.length === 0) return null;

  return (
    <div style={{ overflow: "hidden", padding: "1.5rem 0" }}>
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
    </div>
  );
}
