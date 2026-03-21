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
    <footer className="border-t border-[#2a2a2a] bg-[#121212]">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="md:col-span-1">
            <p className="mb-3 text-xl font-black uppercase tracking-wider text-[#EF5D08]">VEGAVATH</p>
            <p className="mb-6 text-sm leading-relaxed text-[#9a9a9a]">
              Racing toward innovation in automotive, robotics, design, media, and marketing excellence.
            </p>
          </div>

          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#EBEBEB]">Quick Links</p>
            <ul className="space-y-3">
              {QUICK_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-[#9a9a9a] transition-colors hover:text-[#F29C04]">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#EBEBEB]">Our Domains</p>
            <ul className="space-y-3">
              {DOMAINS.map((domain) => (
                <li key={domain} className="text-sm text-[#9a9a9a]">{domain}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#EBEBEB]">Stay Connected</p>
            <SocialLinks settings={settings} />
            {settings?.contact_email && (
              <p className="mt-3 text-sm text-[#9a9a9a]">{settings.contact_email}</p>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-[#2a2a2a] pt-8 sm:flex-row">
          <p className="text-xs text-[#666666]">{`© ${year} Team Vegavath. All rights reserved.`}</p>
          <div className="flex items-center gap-6">
            <Link href="/legal" className="text-xs text-[#666666] transition-colors hover:text-[#F29C04]">Legal</Link>
            <p className="text-xs text-[#666666]">Made with ♥ by Vegavath Team</p>
          </div>
        </div>

        <div className="mt-4 h-px bg-gradient-to-r from-transparent via-[#EF5D08] to-transparent opacity-40" />
      </div>
    </footer>
  );
}