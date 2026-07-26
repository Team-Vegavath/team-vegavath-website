"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import type { GalleryItem } from "@/types/gallery";

type FilterOption = {
  id: string | "all";
  label: string;
};

type Props = {
  items: GalleryItem[];
  filters: FilterOption[];
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

export default function GalleryClient({ items, filters }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterOption["id"]>("all");
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const filtered =
    activeFilter === "all"
      ? items
      : items.filter((item) => item.event_id === activeFilter);

  const slides = filtered
    .filter((item) => item.type === "image")
    .map((item) => ({
      src: item.url,
      alt: item.caption || item.event_label || "Gallery image",
    }));

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  return (
    <>
      {/* Filter tabs: sharp underline treatment */}
      <div
        role="tablist"
        aria-label="Filter gallery by event"
        style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", borderBottom: "1px solid var(--border)" }}
      >
        {filters.map((filter) => {
          const active = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveFilter(filter.id)}
              className="heading"
              style={{
                background: "transparent",
                border: "none",
                borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: "-1px",
                borderRadius: 0,
                padding: "0.65rem 1.1rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: active ? "var(--text-primary)" : "var(--text-muted)",
                cursor: "pointer",
                transition: "color 0.2s, border-color 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Masonry grid */}
      {filtered.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>No photos yet.</p>
      ) : (
        <div className="gallery-columns">
          {filtered.map((item, index) => {
            const videoId = item.type === "video" ? getYouTubeId(item.url) : null;
            const thumbnail = videoId
              ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
              : item.thumbnail_url;
            const imageIndex =
              item.type === "image"
                ? filtered
                    .slice(0, index + 1)
                    .filter((galleryItem) => galleryItem.type === "image").length - 1
                : -1;

            return (
              <article
                key={item.id}
                className="media-card"
                style={{ position: "relative", cursor: "pointer", border: "1px solid var(--border)", background: "var(--bg-card)", overflow: "hidden" }}
                onClick={() => {
                  if (item.type === "image") {
                    openLightbox(imageIndex);
                  } else {
                    setActiveVideo(item.url);
                  }
                }}
              >
                {item.type === "image" ? (
                  <div style={{ position: "relative", overflow: "hidden" }}>
                    <Image
                      src={item.url}
                      alt={item.caption || item.event_label || "Gallery image"}
                      width={800}
                      height={600}
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      style={{ width: "100%", height: "auto", objectFit: "cover", display: "block" }}
                    />
                    <div className="media-card-overlay">
                      <span className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.2em", color: "var(--text-primary)" }}>
                        VIEW
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ position: "relative", aspectRatio: "16/9", background: "var(--bg-card)" }}>
                    {thumbnail ? (
                      <Image
                        src={thumbnail}
                        alt={item.caption || "Video thumbnail"}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        style={{ objectFit: "cover" }}
                      />
                    ) : null}
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,10,10,0.35)" }}>
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
      )}

      {/* Lightbox */}
      <Lightbox
        open={lightboxIndex >= 0}
        close={() => setLightboxIndex(-1)}
        index={lightboxIndex}
        slides={slides}
        plugins={[Zoom, Thumbnails, Video]}
        styles={{
          container: { backgroundColor: "rgba(0,0,0,0.95)" },
        }}
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
            className="mx-auto"
            style={{ position: "relative", aspectRatio: "9/16", width: "90vw", maxWidth: "500px" }}
          >
            <iframe
              src={activeVideo}
              title="Video"
              allow="autoplay; encrypted-media"
              allowFullScreen
              style={{ width: "100%", height: "100%", pointerEvents: "auto" }}
            />
          </div>
        </div>
      )}
    </>
  );
}
