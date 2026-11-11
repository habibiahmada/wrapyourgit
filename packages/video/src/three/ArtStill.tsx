import { ThreeCanvas } from "@remotion/three";
import type { ArchetypeId } from "@wyg/schema";
import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { NeutralToneMapping } from "three";
import { CELL_POSES, type CellPose } from "../art";
import { archetypeRole } from "../cast";
import { IsoCell } from "./diorama/IsoCell";
import { IsoBox, T } from "./diorama/isokit";
import { dioramaScene } from "./diorama/scenes";

/** Every baked composition: web art and the letterhead head. */
export type ArtId =
  | `cutout-cell-${CellPose}`
  | `cutout-${ArchetypeId}`
  | `skin-${ArchetypeId}`
  | "hero-cast"
  | "head-cell";

/** What the orthographic camera frames: the point it looks at and how many units fit across. */
type Framing = { look: [number, number, number]; span: number };

const CUTOUT: Framing = { look: [0, 0.8, 0], span: 4.0 };
const HEAD: Framing = { look: [0, 1.05, 0], span: 1.75 };
const SCENE: Framing = { look: [0, 0.8, 0], span: 7.0 };

/**
 * One loop of Cell for baking (scripts/render-art.ts, ADR-0013), in the crisp isometric style of
 * the landing (ADR-0021): an orthographic camera at the landing's angle (30 degrees up, 45 round),
 * flat-coloured faces, hairline edges. Cutouts are Cell alone on a transparent background;
 * `skin-*` is the archetype's diorama; `hero-cast` is Cell on a small slab of its city. Time comes
 * from the frame and every motion repeats after LOOP_SECONDS, so the loop plays without a jump.
 */
export function ArtStill({ art }: { art: ArtId }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  let framing = CUTOUT;
  let subject: ReactNode;
  if (art.startsWith("skin-")) {
    framing = SCENE;
    subject = dioramaScene(`skin-${art.slice("skin-".length) as ArchetypeId}`, t);
  } else if (art === "head-cell") {
    framing = HEAD;
    subject = <IsoCell motion="groove" t={t} />;
  } else if (art === "hero-cast") {
    framing = { look: [0, 0.6, 0], span: 4.6 };
    subject = (
      <>
        <IsoBox size={[2.6, 0.24, 2.0]} position={[0, -0.12, 0]} tone={T.floor} />
        {[
          [-0.9, -0.6, 0.5],
          [-0.5, -0.6, 0.9],
          [0.9, -0.5, 0.35],
          [0.9, 0.2, 0.6],
          [-0.9, 0.6, 0.3],
        ].map(([x, z, h]) => (
          <IsoBox
            key={`${x}${z}`}
            size={[0.32, h ?? 0.3, 0.32]}
            position={[x ?? 0, (h ?? 0.3) / 2, z ?? 0]}
            tone={(h ?? 0) > 0.5 ? T.green : T.greenDeep}
          />
        ))}
        <IsoCell motion="wave" t={t} position={[0.1, 0, 0.2]} />
      </>
    );
  } else if (art.startsWith("cutout-cell-")) {
    const pose = CELL_POSES[art.slice("cutout-cell-".length) as CellPose];
    subject = <IsoCell look={pose.look} motion={pose.motion} t={t} />;
  } else {
    const role = archetypeRole(art.slice("cutout-".length) as ArchetypeId);
    subject = <IsoCell look={role.look} motion={role.motion} t={t} />;
  }

  return (
    <AbsoluteFill>
      <ThreeCanvas
        width={width}
        height={height}
        orthographic
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        camera={{ position: [10, 8.165, 10], zoom: width / framing.span, near: 0.1, far: 100 }}
        onCreated={(state) => {
          state.camera.position.set(
            framing.look[0] + 10,
            framing.look[1] + 8.165,
            framing.look[2] + 10,
          );
          state.camera.lookAt(...framing.look);
          state.gl.toneMapping = NeutralToneMapping;
        }}
      >
        {subject}
      </ThreeCanvas>
    </AbsoluteFill>
  );
}
