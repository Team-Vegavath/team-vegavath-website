"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";

/* The dynamic(ssr: false) boundary for the hero kart, mirroring
   KartModelWrapper. It has to exist as its own file for two reasons, neither
   cosmetic: dynamic(ssr: false) can only be called from a client component, and
   (public)/page.tsx is a server component -- and an R3F <Canvas> cannot be
   server-rendered at all.

   REDUCED MOTION IS HANDLED HERE RATHER THAN INSIDE HeroKart, and the placement
   is the point. Returning null before the dynamic component is ever rendered
   means Next never requests its chunk, so a visitor with the preference set
   downloads no three.js and no model -- roughly 250 KB of geometry plus the
   whole WebGL stack, skipped rather than loaded and then held still.

   The scroll-linked camera is a JS-driven animation, so the site-wide
   prefers-reduced-motion CSS block could never have reached it (the same gap
   that had ProjectsTeaser's drift silently uncovered from S60 until S71). */

const HeroKart = dynamic(() => import("@/components/home/HeroKart"), { ssr: false });

export default function HeroKartWrapper() {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;
  return <HeroKart />;
}
