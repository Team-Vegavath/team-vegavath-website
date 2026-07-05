import Link from "next/link";
import Image from "next/image";
import type { SiteSettings } from "@/types/settings";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/events", label: "Events" },
  { href: "/gallery", label: "Gallery" },
  { href: "/crew", label: "Crew" },
  { href: "/sponsors", label: "Sponsors" },
  { href: "/join", label: "Join Us" },
  { href: "/legal", label: "Legal" },
] as const;

const LOGO_URL = "https://pub-f86fbbd7cd4a45088698b74e2b9a3e5f.r2.dev/icons/logo.png";

/* Real club socials — used when site_settings has no override */
const DEFAULT_SOCIALS = {
  instagram: "https://www.instagram.com/teamvegavath_pesu/",
  linkedin: "https://www.linkedin.com/company/team-vegavath-pesu",
  github: "https://github.com/Team-Vegavath",
} as const;

interface FooterProps {
  settings: SiteSettings | null;
}

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.4 8.1h4.2V23H.4V8.1zM8.2 8.1h4v2h.06c.56-1.06 1.93-2.18 3.97-2.18 4.25 0 5.03 2.8 5.03 6.44V23h-4.2v-7.4c0-1.77-.03-4.05-2.47-4.05-2.47 0-2.85 1.93-2.85 3.92V23H8.2V8.1z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 2.87-.39c.97 0 1.95.13 2.87.39 2.18-1.49 3.14-1.18 3.14-1.18.63 1.58.24 2.75.12 3.04.73.81 1.18 1.83 1.18 3.09 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14 0 1.54-.02 2.79-.02 3.17 0 .31.21.67.8.55A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

export function Footer({ settings }: FooterProps) {
  const socials = [
    { label: "Instagram", url: settings?.instagram_url || DEFAULT_SOCIALS.instagram, icon: <InstagramIcon /> },
    { label: "LinkedIn", url: settings?.linkedin_url || DEFAULT_SOCIALS.linkedin, icon: <LinkedInIcon /> },
    { label: "GitHub", url: settings?.github_url || DEFAULT_SOCIALS.github, icon: <GitHubIcon /> },
  ];

  return (
    <footer style={{ borderTop: "1px solid var(--border)", background: "var(--bg-base)" }}>
      <div style={{ margin: "0 auto", maxWidth: "80rem", padding: "3rem clamp(1.25rem, 4vw, 4rem) 2rem" }}>
        <div className="footer-row-1">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Image
              src={LOGO_URL}
              alt="Team Vegavath shield"
              width={40}
              height={40}
              style={{ height: "40px", width: "40px", objectFit: "contain" }}
            />
            <p className="heading" style={{ fontWeight: 700, fontSize: "0.95rem", letterSpacing: "0.14em", color: "var(--text-primary)" }}>
              TEAM VEGAVATH — PESU ECC
            </p>
          </div>

          <div style={{ display: "flex", gap: "1.5rem" }}>
            {socials.map(({ label, url, icon }) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                title={label}
                className="footer-social"
                aria-label={label}
              >
                {icon}
              </a>
            ))}
          </div>
        </div>

        <div className="footer-row-2">
          <nav aria-label="Footer">
            <ul style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", listStyle: "none" }}>
              {NAV_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="footer-link">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <p className="mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            © 2026 Team Vegavath
          </p>

          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Built by the Vegavath Coding Domain
          </p>
        </div>
      </div>
    </footer>
  );
}
