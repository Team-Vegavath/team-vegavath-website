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
      <section
        onClick={() => setOpen(true)}
        style={{ position: "relative", width: "100%", minHeight: "72svh", display: "flex", alignItems: "flex-end", overflow: "hidden", cursor: "zoom-in" }}
        aria-label="View team photo full screen"
      >
        <Image
          src={TEAM_PHOTO}
          alt="Team Vegavath at PES University, Electronic City Campus"
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
        {/* Darkens only the bottom ~40% so faces in the photo stay clear */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, transparent 70%)",
          }}
        />
        <div style={{ position: "absolute", bottom: "2rem", left: "2.5rem", right: "1.5rem" }}>
          <h1 className="heading" style={{ fontWeight: 700, fontSize: "clamp(2rem, 6vw, 4.5rem)", lineHeight: 1.05, color: "var(--text-primary)", textTransform: "uppercase" }}>
            Built by students.
            <br />
            For students.
          </h1>
          <p className="mono" style={{ marginTop: "1.25rem", fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            Tap to view full photo
          </p>
        </div>
      </section>

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
