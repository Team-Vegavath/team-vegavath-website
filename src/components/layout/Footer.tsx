import Link from "next/link";
import type { SiteSettings } from "@/types/settings";

const QUICK_LINKS = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/gallery", label: "Gallery" },
  { href: "/crew", label: "Team" },
  { href: "/join", label: "Join Us" },
] as const;

const DOMAINS = [
  "Automotive",
  "Robotics",
  "Design",
  "Media",
  "Marketing",
  "Programming",
] as const;

interface FooterProps {
  settings: SiteSettings | null;
}

interface SocialLink {
  url: string;
  label: string;
}

function SocialLinks({ settings }: { settings: SiteSettings | null }) {
  if (!settings) return null;

  const links: SocialLink[] = [
    { url: settings.instagram_url, label: "Instagram" },
    { url: settings.linkedin_url, label: "LinkedIn" },
    { url: settings.github_url, label: "GitHub" },
  ].filter((l): l is SocialLink => Boolean(l.url));

  if (links.length === 0) return null;

  return (
    <div className="mb-4 flex gap-4">
      {links.map(({ url, label }) => (
        <a
          key={label}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[#9a9a9a] transition-colors hover:text-[#F29C04]"
        >
          {label}
        </a>
      ))}
    </div>
  );
}

export function Footer({ settings }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#2a2a2a] bg-[#1a1a1a] text-[#EBEBEB]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <p className="mb-2 text-lg font-bold">VEGAVATH</p>
            <p className="mb-4 text-sm text-[#9a9a9a]">
              Racing toward innovation in automotive, robotics, design, media,
              and marketing excellence.
            </p>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide">
              Quick Links
            </p>
            <ul className="space-y-2">
              {QUICK_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-[#9a9a9a] transition-colors hover:text-[#F29C04]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide">
              Our Domains
            </p>
            <ul className="space-y-2">
              {DOMAINS.map((domain) => (
                <li key={domain} className="text-sm text-[#9a9a9a]">
                  {domain}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide">
              Stay Connected
            </p>
            <SocialLinks settings={settings} />
            {settings?.contact_email ? (
              <p className="text-sm text-[#9a9a9a]">{settings.contact_email}</p>
            ) : null}
            {settings?.contact_address ? (
              <p className="mt-1 text-sm text-[#9a9a9a]">
                {settings.contact_address}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-[#2a2a2a] pt-6 sm:flex-row">
          <p className="text-xs text-[#666666]">
            {`© ${year} Team Vegavath. All rights reserved.`}
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/legal"
              className="text-xs text-[#666666] transition-colors hover:text-[#F29C04]"
            >
              Legal
            </Link>
            <p className="text-xs text-[#666666]">
              Made with ♥ by Vegavath Team
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}