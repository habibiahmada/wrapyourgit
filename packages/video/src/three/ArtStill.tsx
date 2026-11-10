import { ThreeCanvas } from "@remotion/three";
import type { ArchetypeId } from "@wyg/schema";
import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { NeutralToneMapping } from "three";
import { CELL_POSES, type CellPose } from "../art";
import { archetypeRole } from "../cast";
import { PhotoCard } from "../components/PhotoCard";
import type { PhotoId } from "../photos";
import { BlobShadow } from "./BlobShadow";
import { CELL, Chibi } from "./ChibiCell";
import { CutoutLights } from "./World";

/** Every baked composition: web art and the letterhead head. */
export type ArtId =
  | `cutout-cell-${CellPose}`
  | `cutout-${ArchetypeId}`
  | `skin-${ArchetypeId}`
  | "hero-cast"
  | "head-cell";

/** The landing hero's snapshots, fanned behind Cell. */
const HERO_PHOTOS: { photo: PhotoId; left: number; top: number; tilt: number }[] = [
  { photo: "workshop", left: 0.02, top: 0.2, tilt: -8 },
  { photo: "mountains", left: 0.5, top: 0.18, tilt: 7 },
  { photo: "fireworks", left: 0.24, top: 0.04, tilt: -1 },
];

type Camera = { position: [number, number, number]; fov: number; look: number; lookX?: number };

/** Straight on, a little above: the default framing, for the cutouts the story world draws. */
const STORY_CAMERA: Camera = { position: [0, 1.5, 5.6], fov: 30, look: 0.95 };
/** Close on the head, for the letterhead. */
const HEAD_CAMERA: Camera = { position: [0.06, 1.7, 3.0], fov: 30, look: 1.62, lookX: 0.06 };

/**
 * One loop of Cell for baking (scripts/render-art.ts, ADR-0013): the same rig and looks as the
 * story, so no page shows a different mascot. Time comes from the frame, and every motion repeats
 * after LOOP_SECONDS, so the baked loop plays without a jump. Cutouts are Cell alone
 * on a transparent background; `skin-*` and the hero put Cell in front of real photos.
 */
export function ArtStill({ art }: { art: ArtId }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  // A three-quarter turn so arms and legs read beside the big head on the pages.
  const turn = 0.45;

  let camera = STORY_CAMERA;
  let shadow = true;
  let backdrop: ReactNode = null;
  let subject: ReactNode;
  if (art === "hero-cast") {
    const w = width * 0.48;
    backdrop = HERO_PHOTOS.map(({ photo, left, top, tilt }) => (
      <div key={photo} style={{ position: "absolute", left: left * width, top: top * height }}>
        <PhotoCard photo={photo} width={w} height={w * 0.72} tilt={tilt} />
      </div>
    ));
    subject = <Chibi look={CELL} motion="wave" t={t} scale={1.05} rotationY={0.2} />;
  } else if (art === "head-cell") {
    camera = HEAD_CAMERA;
    shadow = false;
    subject = <Chibi look={CELL} motion="groove" t={t} />;
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
        t={t}
        position={[0.35, 0, 0]}
        scale={1.05}
        rotationY={turn}
      />
    );
  } else if (art.startsWith("cutout-cell-")) {
    const pose = CELL_POSES[art.slice("cutout-cell-".length) as CellPose];
    subject = <Chibi look={pose.look} motion={pose.motion} t={t} rotationY={turn} />;
  } else {
    const role = archetypeRole(art.slice("cutout-".length) as ArchetypeId);
    subject = <Chibi look={role.look} motion={role.motion} t={t} rotationY={turn} />;
  }

  return (
    <AbsoluteFill>
      {backdrop}
      <AbsoluteFill>
        <ThreeCanvas
          width={width}
          height={height}
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
          camera={{ position: camera.position, fov: camera.fov }}
          onCreated={(state) => {
            state.camera.lookAt(camera.lookX ?? 0, camera.look, 0);
            // Khronos PBR Neutral keeps brand colours as picked; ACES shifted the green toward yellow.
            state.gl.toneMapping = NeutralToneMapping;
            state.gl.toneMappingExposure = 1.05;
          }}
        >
          <CutoutLights />
          {/* A soft shadow where the feet meet the ground, so Cell stands instead of floats. */}
          {shadow && <BlobShadow size={[1.9, 1.4]} opacity={0.45} />}
          {subject}
        </ThreeCanvas>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
