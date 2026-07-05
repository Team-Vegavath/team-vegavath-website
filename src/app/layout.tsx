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

export const metadata: Metadata = {
  title: {
    default: "Team Vegavath",
    template: "%s | Team Vegavath",
  },
  description:
    "Team Vegavath is the official student innovation club of PES University, Electronic City Campus — racing toward innovation in automotive, robotics, design, media, and marketing.",
  keywords: ["Vegavath", "PESU ECC", "student club", "robotics", "automotive", "kart"],
  openGraph: {
    title: "Team Vegavath",
    description: "Student innovation club at PES University ECC",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${orbitron.variable} ${chakraPetch.variable} ${spaceGrotesk.variable} ${spaceMono.variable}`}>
      <body>
        <CursorControls />
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}