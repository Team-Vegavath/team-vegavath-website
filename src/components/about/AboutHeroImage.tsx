"use client";

import { useState } from "react";
import Image from "next/image";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

const TEAM_PHOTO = "https://pub-f86fbbd7cd4a45088698b74e2b9a3e5f.r2.dev/team/team-photo.jpeg";

export default function AboutHeroImage() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        style={{ position: "relative", aspectRatio: "16/9", borderRadius: "1.5rem", overflow: "hidden", cursor: "pointer" }}
        className="group"
      >
        <Image
          src={TEAM_PHOTO}
          alt="Team Vegavath"
          fill
          style={{ objectFit: "cover", transition: "transform 0.3s" }}
          className="group-hover:scale-105"
        />
        <div
          style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.3s" }}
          className="group-hover:bg-black/30"
        >
          <span style={{ opacity: 0, color: "white", fontSize: "2rem", transition: "opacity 0.3s" }} className="group-hover:opacity-100">⊕</span>
        </div>
      </div>

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        slides={[{ src: TEAM_PHOTO, alt: "Team Vegavath" }]}
        plugins={[Zoom]}
        styles={{ container: { backgroundColor: "rgba(0,0,0,0.95)", zIndex: 99999 } }}
      />
    </>
  );
}
