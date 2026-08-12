import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(process.env.R2_PUBLIC_HOSTNAME
        ? [
            {
              protocol: "https" as const,
              hostname: process.env.R2_PUBLIC_HOSTNAME,
              pathname: "/**",
            },
          ]
        : []),
      // Hardcoded fallback so image optimization never silently degrades to
      // unoptimized originals when R2_PUBLIC_HOSTNAME is missing from an env.
      {
        protocol: "https" as const,
        hostname: "pub-f86fbbd7cd4a45088698b74e2b9a3e5f.r2.dev",
        pathname: "/**",
      },
      {
        protocol: "https" as const,
        hostname: "img.youtube.com",
        pathname: "/vi/**",
      },
    ],
    // Restrict from Vercel's default 8 device sizes to 3 (mobile/tablet/desktop).
    // Every optimized image generates at most one variant per device size per
    // format, so fewer sizes = proportionally fewer transformation credits.
    deviceSizes: [384, 768, 1200],
    // Cache each transformed image on Vercel's CDN for 1 year. Once a given
    // (image, size, format) is transformed it is served from cache indefinitely
    // ∙ 1000 students loading the same photo cost a single transformation.
    minimumCacheTTL: 31536000, // 60 * 60 * 24 * 365
  },
  // No ignoreBuildErrors. No ignoreDuringBuilds. Ever.
};

export default nextConfig;

