"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useScroll, type MotionValue } from "framer-motion";
import * as THREE from "three";

/* S71B: the real kart behind the hero wordmark, revolving on Y-axis scroll.
   Asset prep, compression settings and the reasoning behind them: docs/gokart.md.

   ── This REVERSES S60's "no canvas/WebGL on /" gate, deliberately ────────────

   S60 moved the 3D kart off the homepage to /projects/kart, and tasks.md carries
   a performance gate that greps for exactly this. That gate is reversed here
   with the project lead's approval, and it is recorded as a reversal rather than
   quietly broken -- a future session finding a <Canvas> on `/` should read this
   before "fixing" it back.

   What makes the reversal affordable is that the ORIGINAL objection no longer
   applies. S60 was refusing an 8.62 MiB / 732k-triangle CAD dump plus
   OrbitControls. This loads a 252 KB / 64k-triangle meshopt-compressed model
   (see docs/gokart.md for how), on a lazy chunk, with no controls, rendering
   only while the page is actually being scrolled. Four separate costs, all of
   them cut:

   1. THE MODEL. 252 KB, which is smaller than most hero photographs.
   2. THE CHUNK. HeroKartWrapper is the dynamic(ssr: false) boundary, so three
      and the loader are a separate lazy chunk. The VEGAVATH h1 is server-rendered
      HTML and paints first -- this cannot block LCP.
   3. THE GPU. frameloop="demand" means React Three Fiber renders NOTHING until
      something calls invalidate(). The only thing that does is the scroll
      subscription in <Rig>. Sitting still on the hero costs zero frames.
   4. REDUCED MOTION. HeroKartWrapper does not render this component at all, so
      the chunk is never even requested. Not "mounted then frozen" -- absent.

   ── Draco is OFF, and that is load-bearing ──────────────────────────────────

   useGLTF(url, false, true) => useDraco: false, useMeshopt: true.

   drei defaults useDraco to TRUE, and its default decoder path is hardcoded to
   https://www.gstatic.com/draco/versioned/decoders/1.5.5/ -- a THIRD outbound
   egress point, which CLAUDE.md requires approval for. MeshoptDecoder ships
   inside three-stdlib, which drei already depends on and which is already in the
   bundle. So the model is meshopt-compressed rather than Draco-compressed
   specifically to avoid adding a network origin, and passing `false` here is
   what removes the wiring. Do not drop these arguments.

   (KartModelSection.tsx still calls useGLTF with defaults and so still carries
   that Draco wiring. It never fires -- its model is not Draco-compressed -- but
   it is flagged in docs/gokart.md.) */

const KART_URL =
  "https://pub-f86fbbd7cd4a45088698b74e2b9a3e5f.r2.dev/models/vegavath-gokart-web-64k.glb";

/* The model is authored in MILLIMETRES: 2240.7 long, 921.3 tall, 1391.1 wide,
   which is a real go-kart. Scaling by 0.001 puts the scene in metres so every
   camera number below is a sane single digit instead of a four-figure one. */
const MM_TO_M = 0.001;

/* Camera path. The kart never rotates -- the CAMERA orbits it, which is what
   keeps the silhouette legible behind the wordmark the whole way. A model
   spinning on its own Y axis passes through a dead-on nose view where the
   shape collapses to a sliver, which is the reason that option was rejected.

   ~115 degrees of sweep, front-three-quarter to rear-three-quarter. */
const ANGLE_START = -0.55;
const ANGLE_SWEEP = 2.0;

/* THE DISTANCE IS NOT MONOTONIC. It pushes in and pulls back several times
   across the hero rather than closing steadily, which is the "zoom in and out"
   ask.

   IT IS ALSO NOT Math.random(), deliberately. Real randomness would give every
   visitor a different page, re-roll on any re-render, and be impossible to tune
   -- "move the second push slightly later" is not a thing you can ask of noise.
   Two sine waves at non-multiple frequencies with an offset phase read as
   irregular to the eye while staying byte-identical on every load. The slow one
   does the obvious breathing; the fast one is what stops it feeling like a
   metronome.

   Net range works out to roughly 2.5 -> 3.3 units, about a 25% size swing:
   clearly felt, not enough to be seasick-making behind text you are reading. */
const RADIUS_BASE = 3.1;
const RADIUS_TREND = -0.35;
const SWELL_SLOW = 0.42;
const SWELL_FAST = 0.16;
const SWELL_FAST_PHASE = 1.1;

/* Above the kart's roll hoop, looking slightly down -- a below-axle camera
   makes any vehicle read as a toy. */
const EYE_HEIGHT = 0.95;

/* A 2.24m-long object seen through a PORTRAIT viewport has almost no horizontal
   field of view to fit into: at 375px the scripted radius above would put the
   kart's nose and tail off both sides of the screen. Rather than special-case a
   breakpoint, the rig computes the distance at which the length actually fits
   and never goes closer than that. On a wide desktop the required distance is
   ~2.0, below the scripted range, so this clamp does nothing there. */
const FIT_MARGIN = 1.12;

/* The kart sits behind a 140px wordmark. Opacity is the direct control the
   brief asked for; light intensity below is the second, subtler one -- dimming
   lights reads as an unlit object, opacity reads as further away. */
const OPACITY = 0.4;

/* The model and the rig live in ONE component, inside Suspense, because the rig
   needs a number only the model can supply: how long the kart actually is. That
   was briefly a hardcoded 1.12 taken from this specific file, which is exactly
   the kind of constant that silently mis-frames everything the day someone
   re-exports the model slightly differently. Measured instead. */
function Scene({ progress }: { progress: MotionValue<number> }) {
  const { scene } = useGLTF(KART_URL, false, true);

  const { offset, halfLength } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const centre = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    return {
      /* The bounding-box CENTRE is not the origin -- for this model it sits at
         roughly (823, 328, 0) in mm, because the CAD origin is out near an
         axle. Orbiting 0,0,0 without this correction swings the kart around
         like it is bolted to a fairground ride.

         Applied as an absolute `position` rather than scene.position.sub():
         useGLTF CACHES the scene object, so a subtract would compound on every
         remount and walk the kart out of frame. */
      offset: [-centre.x, -centre.y, -centre.z] as [number, number, number],
      /* Widest HORIZONTAL extent, which is what has to survive a narrow
         viewport. Y is excluded on purpose: the kart is 2.24 long and 1.39
         wide but only 0.92 tall, so height is never the binding constraint. */
      halfLength: (Math.max(size.x, size.z) * MM_TO_M) / 2,
    };
  }, [scene]);

  return (
    <>
      <group scale={MM_TO_M}>
        <primitive object={scene} position={offset} />
      </group>
      <Rig progress={progress} halfLength={halfLength} />
    </>
  );
}

function Rig({ progress, halfLength }: { progress: MotionValue<number>; halfLength: number }) {
  const { camera, invalidate, size } = useThree();

  /* THIS SUBSCRIPTION IS THE ENTIRE RENDER LOOP. Under frameloop="demand"
     nothing draws until invalidate() is called, so the canvas is completely
     idle unless the page is moving. `.on` returns its own unsubscribe, so it IS
     the cleanup function. */
  useEffect(() => progress.on("change", invalidate), [progress, invalidate]);

  /* Smallest distance that still fits the kart's LENGTH across the viewport.
     Derived from the camera's actual FOV and aspect rather than guessed per
     breakpoint, so it stays correct at any window size including mid-drag
     resizes. Recomputed only when the canvas is resized, not per frame. */
  const minDistance = useMemo(() => {
    const vHalf = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 360;
    const hHalf = Math.atan(Math.tan(vHalf) * (size.width / size.height));
    return (halfLength * FIT_MARGIN) / Math.tan(hHalf);
  }, [camera, size.width, size.height, halfLength]);

  useFrame(() => {
    const p = progress.get();
    const angle = ANGLE_START + p * ANGLE_SWEEP;
    const radius = Math.max(
      minDistance,
      RADIUS_BASE +
        RADIUS_TREND * p +
        SWELL_SLOW * Math.sin(p * Math.PI * 2) +
        SWELL_FAST * Math.sin(p * Math.PI * 5 + SWELL_FAST_PHASE)
    );
    camera.position.set(Math.sin(angle) * radius, EYE_HEIGHT, Math.cos(angle) * radius);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export default function HeroKart() {
  const ref = useRef<HTMLDivElement>(null);

  /* offset ["start start", "end start"] measures THIS element's travel past the
     top of the viewport. The wrapper is inset: 0 inside the hero, so its bounds
     are the hero's bounds and progress runs 0 -> 1 across exactly one screen of
     scrolling. Same mechanism ProjectsTeaser uses, different offset because that
     one measures a mid-page band and this one starts at the top. */
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  /* Read --accent rather than hardcoding it. three.js cannot resolve CSS custom
     properties, and this file would otherwise be the one place in the codebase
     with a literal hex. Safe to read during render: this component only ever
     renders on the client (its wrapper is dynamic with ssr: false). If the token
     ever goes missing the rim light is simply omitted rather than falling back
     to a second copy of the colour. */
  const accent = useMemo(
    () => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
    []
  );

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: OPACITY }}
    >
      {/* dpr capped at 1.5: this is a backdrop, and rendering it at a 3x
          retina ratio triples the fragment cost for detail nobody reads
          through a 140px wordmark. */}
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ fov: 38, position: [0, EYE_HEIGHT, RADIUS_BASE] }}
        style={{ background: "transparent" }}
      >
        {/* No <Stage>. Its environment="city" preset FETCHES an HDRI, which is
            both a new network request and a fourth egress point. A three-light
            rig costs nothing and the darker result suits this site better than
            a bright studio preset would.

            Intensities are the tuning knob for how far the kart sits back, NOT
            opacity -- dimming lights makes it recede like an unlit object,
            whereas a translucent one just looks washed out. */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 6, 3]} intensity={1.4} />
        {accent && <directionalLight position={[-5, 2, -4]} intensity={0.9} color={accent} />}

        {/* Rig lives INSIDE Suspense with the model -- it needs the measured
            kart length to know how far back a narrow viewport has to sit. Until
            the model resolves nothing renders anyway (fallback is null), and the
            Canvas camera prop covers the initial frame. */}
        <Suspense fallback={null}>
          <Scene progress={scrollYProgress} />
        </Suspense>
      </Canvas>
    </div>
  );
}
