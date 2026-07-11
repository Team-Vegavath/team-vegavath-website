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
  },
  // No ignoreBuildErrors. No ignoreDuringBuilds. Ever.
};

export default nextConfig;

