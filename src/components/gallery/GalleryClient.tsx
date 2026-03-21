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
      {/* Filter tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.75rem" }}>
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setActiveFilter(filter.id)}
            style={{
              borderRadius: "9999px",
              border: activeFilter === filter.id ? "1.5px solid #EF5D08" : "1.5px solid #EF5D08",
              background: activeFilter === filter.id ? "#EF5D08" : "transparent",
              color: activeFilter === filter.id ? "white" : "#EF5D08",
              padding: "0.75rem 1.75rem",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={e => {
              if (activeFilter !== filter.id) {
                (e.currentTarget as HTMLButtonElement).style.background = "#EF5D08";
                (e.currentTarget as HTMLButtonElement).style.color = "white";
              }
            }}
            onMouseLeave={e => {
              if (activeFilter !== filter.id) {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "#EF5D08";
              }
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Masonry grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-base text-[#9a9a9a]">No photos yet.</p>
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
                className="mb-4 break-inside-avoid group relative cursor-auto"
                onClick={() => {
                  if (item.type === "image") {
                    openLightbox(imageIndex);
                  } else {
                    setActiveVideo(item.url);
                  }
                }}
              >
                {item.type === "image" ? (
                  <div className="relative overflow-hidden rounded-lg">
                    <Image
                      src={item.url}
                      alt={item.caption || item.event_label || "Gallery image"}
                      width={800}
                      height={600}
                      className="w-full rounded-lg transition-transform duration-300 group-hover:scale-105"
                      style={{ objectFit: "cover" }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 rounded-lg flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-3xl">⊕</span>
                    </div>
                  </div>
                ) : (
                  <div
                    className="relative aspect-video overflow-hidden rounded-lg bg-[#1a1a1a] transition-all group-hover:ring-2 group-hover:ring-[#EF5D08] cursor-auto"
                  >
                    {thumbnail ? (
                      <Image
                        src={thumbnail}
                        alt={item.caption || "Video thumbnail"}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover"
                      />
                    ) : null}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-colors group-hover:bg-black/60">
                      <span className="text-4xl text-white">▶</span>
                    </div>
                  </div>
                )}
                {item.caption ? (
                  <p className="mt-1 text-sm text-[#9a9a9a]">{item.caption}</p>
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
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 cursor-auto">
          <button
            onClick={() => setActiveVideo(null)}
            className="absolute top-5 right-5 text-white text-3xl"
          >
            ✕
          </button>

          <div className="relative mx-auto aspect-[9/16] w-[90vw] max-w-[500px] cursor-auto">
            <iframe
              src={activeVideo}
              title="Video"
              allow="autoplay; encrypted-media"
              allowFullScreen
              className="w-full h-full pointer-events-auto cursor-auto"
            />
          </div>
        </div>
      )}
    </>
  );
}
