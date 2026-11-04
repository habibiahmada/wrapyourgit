import type { LayoutFamily, RecapData } from "@wyg/schema";
import type { ReactNode } from "react";
import { beats } from "./audio/track";
import { archetypeRole, CAST, CREW, type Role } from "./cast";
import { LiveAccent } from "./components/LiveAccent";
import { Chibi, TossedBlock } from "./three/ChibiCell";
import type { SceneId } from "./timeline";

/*
 * One character per scene (cast.ts), rendered live in 3D so its limbs, head and face move,
 * placed in the space that scene's layout leaves empty: large, without covering a number or a
 * label. Positions are tuned per layout family from rendered stills of the sample and edge
 * recaps (docs/video/scene-system.md).
 */

type Spot = { x: number; y: number; size: number };
type PerLayout = Record<LayoutFamily, Spot>;

function solo(
  spots: PerLayout,
  layout: LayoutFamily,
  role: Role,
  at: number,
  enter: "right" | "bottom" = "bottom",
): ReactNode {
  const { x, y, size } = spots[layout];
  return (
    <LiveAccent at={at} enter={enter} x={x} y={y} size={size}>
      {(t) => <Chibi look={role.look} motion={role.motion} t={t} />}
    </LiveAccent>
  );
}

export function sceneAccent(id: SceneId, data: RecapData, layout: LayoutFamily): ReactNode {
  switch (id) {
    case "intro":
      return solo(
        {
          portrait: { x: 0.72, y: 0.4, size: 0.95 },
          compact: { x: 0.76, y: 0.42, size: 0.75 },
          landscape: { x: 0.76, y: 0.46, size: 0.72 },
        },
        layout,
        CAST.intro,
        beats(1),
        "right",
      );
    case "contributions":
      return solo(
        {
          portrait: { x: 0.7, y: 0.5, size: 0.9 },
          compact: { x: 0.76, y: 0.5, size: 0.66 },
          landscape: { x: 0.82, y: 0.74, size: 0.5 },
        },
        layout,
        CAST.contributions,
        beats(2),
        "right",
      );
    case "rhythm":
      return solo(
        {
          portrait: { x: 0.66, y: 0.78, size: 0.8 },
          compact: { x: 0.64, y: 0.46, size: 0.6 },
          landscape: { x: 0.56, y: 0.55, size: 0.5 },
        },
        layout,
        CAST.rhythm,
        beats(8),
      );
    case "tech-dna":
      return solo(
        {
          portrait: { x: 0.66, y: 0.53, size: 0.72 },
          compact: { x: 0.84, y: 0.47, size: 0.42 },
          landscape: { x: 0.45, y: 0.76, size: 0.36 },
        },
        layout,
        CAST["tech-dna"],
        beats(6),
      );
    case "projects":
      return solo(
        {
          portrait: { x: 0.58, y: 0.45, size: 0.85 },
          compact: { x: 0.62, y: 0.42, size: 0.6 },
          landscape: { x: 0.44, y: 0.8, size: 0.34 },
        },
        layout,
        CAST.projects,
        beats(1),
      );
    case "community": {
      // Three friends passing a contribution cell, one throw per beat.
      const { x, y, size } = {
        portrait: { x: 0.54, y: 0.52, size: 1.0 },
        compact: { x: 0.66, y: 0.56, size: 0.75 },
        landscape: { x: 0.74, y: 0.36, size: 0.66 },
      }[layout];
      return (
        <LiveAccent
          at={beats(4)}
          enter="right"
          x={x}
          y={y}
          size={size}
          aspect={1.5}
          camera={{ z: 7.4, y: 1.7, look: 1 }}
        >
          {(t) => (
            <>
              {CREW.map((member) => (
                <Chibi
                  key={member.x}
                  look={member.look}
                  motion="pass"
                  t={t}
                  seed={member.seed}
                  position={[member.x, 0, 0]}
                  rotationY={-member.x * 0.25}
                  scale={0.82}
                />
              ))}
              <TossedBlock from={[-1.2, 1.0, 0.45]} to={[1.2, 1.0, 0.45]} t={t} />
            </>
          )}
        </LiveAccent>
      );
    }
    case "engineering":
      return solo(
        {
          portrait: { x: 0.6, y: 0.82, size: 0.8 },
          compact: { x: 0.74, y: 0.78, size: 0.55 },
          landscape: { x: 0.84, y: 0.8, size: 0.4 },
        },
        layout,
        CAST.engineering,
        beats(2),
      );
    case "identity":
      return solo(
        {
          portrait: { x: 0.64, y: 0.8, size: 0.85 },
          compact: { x: 0.7, y: 0.8, size: 0.62 },
          landscape: { x: 0.76, y: 0.66, size: 0.72 },
        },
        layout,
        archetypeRole(data.identity.archetype),
        beats(3),
      );
    case "closing":
      return solo(
        {
          portrait: { x: 0.74, y: 0.42, size: 0.62 },
          compact: { x: 0.8, y: 0.4, size: 0.46 },
          landscape: { x: 0.88, y: 0.8, size: 0.4 },
        },
        layout,
        CAST.closing,
        beats(7),
      );
    default:
      return null;
  }
}
