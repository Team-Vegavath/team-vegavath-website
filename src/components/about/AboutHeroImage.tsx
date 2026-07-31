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
        {/* S71C: the scrim is TIGHTER than it was -- 0.35 at 28% and clear by
            52%, against 0.4 at 40% and clear by 70%. The overlay text is one
            line rather than two now, so the dark band no longer has to cover
            two lines' worth of height, and every row of the photo it stops
            covering is a row of faces you can actually see. Same fix as the
            headline change below, applied to the other thing that was hiding
            people. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 28%, transparent 52%)",
          }}
        />
        {/* S71C: THE PROBLEM WAS THAT THE CAPTION HELD THE HEADLINE UP.
            "Tap to view full photo" used to sit on its own row BELOW the
            headline, which pushed the headline up into the group -- and the
            headline was two lines, so it occupied roughly a third of the frame's
            height right where the front rows' faces are.

            Both fixes are the same fix: give the text less vertical space and
            put it lower. The caption moves onto the headline's own baseline at
            the RIGHT edge, where it sits over the far end of the group instead
            of stacking under the words, and the block drops from 2rem to 1.5rem
            off the bottom. Net effect is roughly a line and a half of photo
            handed back.

            flexWrap is what makes this safe below ~700px: the caption drops back
            under the headline rather than crushing it. Left and right insets are
            now equal and use the site's standard clamp(1.25rem, 4vw, 4rem) --
            they were 2.5rem and 1.5rem, which had the caption's right edge
            landing on no particular line. */}
        <div
          style={{
            position: "absolute",
            bottom: "1.5rem",
            left: "clamp(1.25rem, 4vw, 4rem)",
            right: "clamp(1.25rem, 4vw, 4rem)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem 2rem",
          }}
        >
          {/* One line, and the <br /> is GONE rather than replaced by a wrap
              guard -- the browser is allowed to wrap this if it has to. The vw
              term rises to 3.6 so the line still hits its 4.5rem ceiling on a
              wide screen: a single 32-character line scales predictably, so it
              holds one line down to ~1100px and wraps to two below that on its
              own. text-wrap: balance is there so that wrap splits evenly instead
              of leaving one orphaned word. */}
          <h1
            className="heading"
            style={{
              fontWeight: 700,
              fontSize: "clamp(1.5rem, 3.6vw, 4.5rem)",
              lineHeight: 1.05,
              color: "var(--text-primary)",
              textTransform: "uppercase",
              textWrap: "balance",
            }}
          >
            Built by students. For students.
          </h1>
          <p
            className="mono"
            style={{
              /* nowrap + no shrink: this is a 21-character label, and letting
                 flex squeeze it would break it across three lines long before
                 the headline gave up any width. */
              whiteSpace: "nowrap",
              flexShrink: 0,
              paddingBottom: "0.35rem",
              fontSize: "0.7rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
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
