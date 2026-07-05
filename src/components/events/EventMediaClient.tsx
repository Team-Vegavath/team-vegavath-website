"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import type { GalleryItem } from "@/types/gallery";

type Props = {
  items: GalleryItem[];
  eventTitle: string;
};

function getYouTubeId(url: string) {
  const match = url.match(/embed\/([^?]+)/);
  return match ? match[1] : null;
}

function PlayIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      <rect x="1" y="1" width="42" height="42" fill="rgba(10,10,10,0.6)" stroke="var(--text-primary)" strokeWidth="1" />
      <path d="M17 13 L31 22 L17 31 Z" fill="var(--text-primary)" />
    </svg>
  );
}

export default function EventMediaClient({ items, eventTitle }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const imageItems = items.filter((item) => item.type === "image");

  const slides = imageItems.map((item) => ({
    src: item.url,
    alt: item.caption || `${eventTitle} photo`,
  }));

  const openLightbox = useCallback((imageIndex: number) => {
    setLightboxIndex(imageIndex);
  }, []);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))", gap: "1rem", width: "100%" }}>
        {items.map((item) => {
          const videoId = item.type === "video" ? getYouTubeId(item.url) : null;
          const thumbnail = videoId
            ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
            : item.thumbnail_url;

          const imageIndex = item.type === "image"
            ? imageItems.findIndex((img) => img.id === item.id)
            : -1;

          return (
            <article
              key={item.id}
              onClick={() => {
                if (item.type === "image") openLightbox(imageIndex);
                else if (item.url) setActiveVideo(item.url);
              }}
              style={{ overflow: "hidden", border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", position: "relative" }}
              className="media-card"
            >
              {item.type === "image" ? (
                <div style={{ position: "relative", aspectRatio: "16/9", width: "100%" }}>
                  <Image
                    src={item.url}
                    alt={item.caption || `${eventTitle} photo`}
                    fill
                    style={{ objectFit: "cover", transition: "transform 0.3s" }}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  />
                  <div className="media-card-overlay">
                    <span className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.2em", color: "var(--text-primary)" }}>
                      VIEW
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ position: "relative", aspectRatio: "16/9", width: "100%", background: "var(--bg-card)" }}>
                  {thumbnail ? (
                    <Image
                      src={thumbnail}
                      alt={item.caption || "Video thumbnail"}
                      fill
                      style={{ objectFit: "cover" }}
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    />
                  ) : null}
                  <div style={{ position: "absolute", inset: 0, background: "rgba(10,10,10,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <PlayIcon />
                  </div>
                </div>
              )}
              {item.caption ? (
                <p style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>{item.caption}</p>
              ) : null}
            </article>
          );
        })}
      </div>

      <Lightbox
        open={lightboxIndex >= 0}
        close={() => setLightboxIndex(-1)}
        index={lightboxIndex}
        slides={slides}
        plugins={[Zoom, Thumbnails]}
        styles={{ container: { backgroundColor: "rgba(0,0,0,0.95)", zIndex: 99999 } }}
      />

      {activeVideo && (
        <div
          onClick={() => setActiveVideo(null)}
          style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.9)" }}
        >
          <button
            onClick={() => setActiveVideo(null)}
            aria-label="Close video"
            style={{ position: "absolute", top: "1.25rem", right: "1.25rem", color: "var(--text-primary)", fontSize: "1.75rem", lineHeight: 1, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-space), sans-serif" }}
          >
            ×
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: "relative", aspectRatio: "9/16", width: "90vw", maxWidth: "500px" }}
          >
            <iframe
              src={activeVideo}
              title="Video"
              allow="autoplay; encrypted-media"
              allowFullScreen
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </div>
      )}
    </>
  );
}
