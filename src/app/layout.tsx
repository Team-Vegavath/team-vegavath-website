import type { Metadata, Viewport } from "next";
import { Orbitron, Chakra_Petch, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { CursorControls } from "@/components/layout/CursorControls";
import { PageTransition } from "@/components/layout/PageTransition";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["900"],
  variable: "--font-orbitron",
  display: "swap",
});

const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-chakra",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-space",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap",
});

const R2 =
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ??
  "https://pub-f86fbbd7cd4a45088698b74e2b9a3e5f.r2.dev";

export const metadata: Metadata = {
  title: {
    default: "Team Vegavath | PESU ECC",
    template: "%s | Team Vegavath",
  },
  metadataBase: new URL("https://vegavath.live"),
  description:
    "Team Vegavath is the official student innovation club of PES University, Electronic City Campus, racing toward innovation in automotive, robotics, design, media, and marketing.",
  alternates: {
    canonical: "/",
  },
  keywords: ["Vegavath", "PESU ECC", "student club", "robotics", "automotive", "kart"],
  icons: {
    icon: "/icon",
  },
  openGraph: {
    title: "Team Vegavath",
    description: "Student innovation club at PES University ECC",
    url: "https://vegavath.live",
    siteName: "Team Vegavath",
    images: [
      {
        url: `${R2}/icons/logo.png`,
        width: 1197,
        height: 1050,
        alt: "Team Vegavath",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Team Vegavath",
    description: "Student innovation club at PES University ECC",
    images: [`${R2}/icons/logo.png`],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// S49 LLM/AI SEO: site-wide Organization graph. Rendered in the tree rather than
// a <head> block - App Router has no <head> here, and Next's documented JSON-LD
// pattern is an inline <script> in the layout body, which crawlers read fine.
// Logo uses the same R2 constant as the OG image so one env var moves both.
const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Team Vegavath",
  alternateName: "Team Vegavath PESU ECC",
  url: "https://vegavath.live",
  logo: `${R2}/icons/logo.png`,
  description:
    "Motorsport and innovation student club at PES University Electronic City Campus (PESU ECC), Bangalore. Designs and builds go-karts, develops robotics systems, and organizes technical events.",
  sport: "Motorsport",
  memberOf: {
    "@type": "CollegeOrUniversity",
    name: "PES University Electronic City Campus",
    alternateName: "PESU ECC",
  },
  location: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Bangalore",
      addressRegion: "Karnataka",
      addressCountry: "IN",
    },
  },
  sameAs: [
    "https://www.instagram.com/teamvegavath_pesu/",
    "https://www.linkedin.com/company/team-vegavath-pesu",
    "https://github.com/Team-Vegavath",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${orbitron.variable} ${chakraPetch.variable} ${spaceGrotesk.variable} ${spaceMono.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <CursorControls />
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}