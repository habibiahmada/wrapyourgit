import { ThreeCanvas } from "@remotion/three";
import type { ArchetypeId } from "@wyg/schema";
import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { NeutralToneMapping } from "three";
import { archetypeRole } from "../cast";
import { PhotoCard } from "../components/PhotoCard";
import type { PhotoId } from "../photos";
import { BlobShadow } from "./BlobShadow";
import { CELL, Chibi, type ChibiMotion, type Look } from "./ChibiCell";
import { CutoutLights } from "./World";

/** The host's poses for the baked cutouts used across the web pages and exports. */
export type CellPose = "wave" | "cheer" | "think" | "proud" | "sleep";

export type ArtId =
  | `cutout-cell-${CellPose}`
  | `cutout-${ArchetypeId}`
  | `skin-${ArchetypeId}`
  | "hero-cast";

/** Cell's look and motion for each baked pose: the same rig and looks as the story. */
const CELL_POSES: Record<CellPose, { look: Look; motion: ChibiMotion }> = {
  wave: { look: CELL, motion: "wave" },
  cheer: { look: { ...CELL, eyes: "happy" }, motion: "cheer" },
  think: { look: { ...CELL, gear: ["glasses"] }, motion: "think" },
  proud: { look: { ...CELL, eyes: "happy", gear: ["crown"] }, motion: "proud" },
  sleep: { look: { ...CELL, eyes: "sleepy" }, motion: "sleep" },
};

/**
 * When to catch each motion for a still: the peak of the gesture. On the beat itself (e.g. 1.5 s)
 * every motion passes through its neutral pose: hops land, running legs cross, the hammer is
 * behind the head. Seconds; the music runs two beats a second.
 */
const PEAK: Partial<Record<ChibiMotion, number>> = {
  run: 1.625,
  cheer: 1.75,
  groove: 1.75,
  hammer: 1.58,
  celebrate: 1.5,
  pass: 1.62,
};

/** The landing hero's snapshots, fanned behind Cell: three of the places the story visits. */
const HERO_PHOTOS: { photo: PhotoId; left: number; top: number; tilt: number }[] = [
  { photo: "workshop", left: 0.02, top: 0.2, tilt: -8 },
  { photo: "mountains", left: 0.5, top: 0.18, tilt: 7 },
  { photo: "fireworks", left: 0.24, top: 0.04, tilt: -1 },
];

/**
 * Bakes still PNGs of Cell (scripts/render-art.ts) for places that don't run the live 3D: the web
 * pages, loading states, the OG image and the letter slide. Same rig and looks as the story, so a
 * page never shows a different mascot. Cutouts are Cell alone on a transparent background;
 * `skin-*` and the hero put Cell in front of real photos (photos.ts), like the story scenes.
 * Time comes from the frame, so a given frame always renders the same image.
 */
export function ArtStill({ art }: { art: ArtId }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const at = (motion: ChibiMotion) => PEAK[motion] ?? frame / fps;
  // A three-quarter turn so arms and legs read beside the big head instead of behind it.
  const turn = 0.45;

  let backdrop: ReactNode = null;
  let subject: ReactNode;
  if (art === "hero-cast") {
    const w = width * 0.48;
    backdrop = HERO_PHOTOS.map(({ photo, left, top, tilt }) => (
      <div key={photo} style={{ position: "absolute", left: left * width, top: top * height }}>
        <PhotoCard photo={photo} width={w} height={w * 0.72} tilt={tilt} />
      </div>
    ));
    subject = <Chibi look={CELL} motion="wave" t={at("wave")} scale={1.05} rotationY={0.2} />;
  } else if (art.startsWith("skin-")) {
    const role = archetypeRole(art.slice("skin-".length) as ArchetypeId);
    const w = width * 0.8;
    backdrop = (
      <div style={{ position: "absolute", left: (width - w) / 2, top: height * 0.04 }}>
        <PhotoCard photo={role.photo} width={w} height={w * 0.72} tilt={role.tilt} t={1.5} />
      </div>
    );
    subject = (
      <Chibi
        look={role.look}
        motion={role.motion}
        t={at(role.motion)}
        position={[0.35, 0, 0]}
        scale={1.05}
        rotationY={turn}
      />
    );
  } else if (art.startsWith("cutout-cell-")) {
    const pose = CELL_POSES[art.slice("cutout-cell-".length) as CellPose];
    subject = <Chibi look={pose.look} motion={pose.motion} t={at(pose.motion)} rotationY={turn} />;
  } else {
    const role = archetypeRole(art.slice("cutout-".length) as ArchetypeId);
    subject = <Chibi look={role.look} motion={role.motion} t={at(role.motion)} rotationY={turn} />;
  }

  return (
    <AbsoluteFill>
      {backdrop}
      <AbsoluteFill>
        <ThreeCanvas
          width={width}
          height={height}
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
          // Straight on, a little above, like the story's LiveAccent.
          camera={{ position: [0, 1.5, 5.6], fov: 30 }}
          onCreated={(state) => {
            state.camera.lookAt(0, 0.95, 0);
            // Khronos PBR Neutral keeps brand colours as picked; ACES shifted the green toward yellow.
            state.gl.toneMapping = NeutralToneMapping;
            state.gl.toneMappingExposure = 1.05;
          }}
        >
          <CutoutLights />
          {/* A soft shadow where the feet meet the ground, so Cell stands instead of floats. */}
          <BlobShadow size={[1.9, 1.4]} opacity={0.45} />
          {subject}
        </ThreeCanvas>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
