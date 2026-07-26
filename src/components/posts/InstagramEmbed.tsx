"use client";

import Script from "next/script";

// S54: renders a public Instagram post inside a post page.
//
// No Meta API token is involved. The /instagram_oembed endpoint needs an app
// access token, but the markup it returns is just this blockquote -- writing the
// blockquote ourselves and letting embed.js hydrate it is the tokenless path,
// and it is the one Meta documents alongside the `omitscript` option.
// Confirmed against Context7 (/websites/developers_facebook_instagram):
// instgrm.Embeds.process() is still the documented manual-init call, and the
// markup contract is class="instagram-media" + data-instgrm-permalink +
// data-instgrm-version.
//
// next/script rather than a hand-rolled useEffect + appendChild: Next dedupes by
// src, and onReady fires on load AND on every remount, which is exactly the
// re-process case (client-side nav to a second Instagram post would otherwise
// leave the blockquote unhydrated). First use of next/script in this repo.
declare global {
  interface Window {
    instgrm?: { Embeds: { process(): void } };
  }
}

export function InstagramEmbed({ url }: { url: string }) {
  return (
    // Wrapper carries the layout because embed.js rewrites the blockquote's own
    // style attribute when it swaps in the iframe.
    <div
      className="mx-auto"
      style={{ maxWidth: "540px", marginTop: "2.5rem", marginBottom: "1rem" }}
    >
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          width: "100%",
          minHeight: "200px",
        }}
      />
      <Script
        src="https://www.instagram.com/embed.js"
        strategy="lazyOnload"
        onReady={() => window.instgrm?.Embeds.process()}
      />
    </div>
  );
}
