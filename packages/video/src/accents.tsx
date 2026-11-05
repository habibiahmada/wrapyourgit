import type { LayoutFamily, RecapData } from "@wyg/schema";
import type { ReactNode } from "react";
import type { SpriteId } from "./art";
import { beats } from "./audio/track";
import { BranchLine, CellScatter, Silhouette, type SilhouetteSpot } from "./components/Backdrop";
import { CellDash, DASH_BEATS, type DashStyle } from "./components/CellDash";
import { SpriteAccent } from "./components/SpriteAccent";
import { type SceneId, TIMELINE } from "./timeline";

/*
 * What each scene draws behind its text: GitHub motifs on the field, and Cell, either looping its
 * baked motion (Sprite, ADR-0013) so its limbs, head and face move, or as a giant faint
 * silhouette, so not every slide has the mascot standing in it. A standing Cell is placed in the
 * space that scene's layout leaves empty: large, without covering a number or a label. Positions
 * are tuned per layout family from rendered stills of the sample and edge recaps
 * (docs/video/scene-system.md).
 */

type Spot = { x: number; y: number; size: number };
type PerLayout = Record<LayoutFamily, Spot>;

function solo(
  spots: PerLayout,
  layout: LayoutFamily,
  sprite: SpriteId,
  at: number,
  enter: "right" | "bottom" = "bottom",
): ReactNode {
  const { x, y, size } = spots[layout];
  return <SpriteAccent sprite={sprite} at={at} enter={enter} x={x} y={y} size={size} />;
}

function figure(id: SceneId, data: RecapData, layout: LayoutFamily): ReactNode {
  switch (id) {
    case "intro":
      return solo(
        {
          portrait: { x: 0.72, y: 0.4, size: 0.95 },
          compact: { x: 0.76, y: 0.42, size: 0.75 },
          landscape: { x: 0.76, y: 0.46, size: 0.72 },
        },
        layout,
        "wave",
        beats(1),
        "right",
      );
    case "contributions":
      return solo(
        {
          portrait: { x: 0.62, y: 0.52, size: 0.7 },
          compact: { x: 0.76, y: 0.55, size: 0.48 },
          landscape: { x: 0.84, y: 0.8, size: 0.42 },
        },
        layout,
        "cheer",
        beats(DASH_BEATS),
        "right",
      );
    case "rhythm":
      // Cell the runner, as a giant shadow behind the calendar.
      return giant(id, "arch-consistent", layout, {
        portrait: { x: 0.74, feet: 1.06, size: 0.6 },
        compact: { x: 0.78, feet: 1.1, size: 0.8 },
        landscape: { x: 0.84, feet: 1.12, size: 1.05 },
      });
    case "tech-dna":
      return giant(id, "think", layout, {
        portrait: { x: 0.8, feet: 1.04, size: 0.55 },
        compact: { x: 0.82, feet: 1.08, size: 0.75 },
        landscape: { x: 0.86, feet: 1.1, size: 1.0 },
      });
    case "projects":
      // The waffle and its legend need the room: Cell hammers away as a giant shadow behind.
      return giant(id, "hammer", layout, {
        portrait: { x: 0.82, feet: 1.14, size: 0.42 },
        compact: { x: 0.84, feet: 1.1, size: 0.72 },
        landscape: { x: 0.52, feet: 1.14, size: 1.0 },
      });
    case "community":
      return giant(id, "cheer", layout, {
        portrait: { x: 0.8, feet: 0.72, size: 0.5, flip: true },
        compact: { x: 0.84, feet: 0.78, size: 0.7, flip: true },
        landscape: { x: 0.2, feet: 1.12, size: 1.0 },
      });
    case "engineering":
      return giant(id, "arch-collaborator", layout, {
        portrait: { x: 0.78, feet: 1.05, size: 0.55 },
        compact: { x: 0.82, feet: 1.08, size: 0.75 },
        landscape: { x: 0.86, feet: 1.12, size: 1.05 },
      });
    case "identity":
      return solo(
        {
          portrait: { x: 0.6, y: 0.865, size: 0.62 },
          compact: { x: 0.8, y: 0.87, size: 0.42 },
          landscape: { x: 0.8, y: 0.66, size: 0.66 },
        },
        layout,
        data.identity.archetype ? `arch-${data.identity.archetype}` : "sleep",
        beats(3),
      );
    case "closing":
      return solo(
        {
          portrait: { x: 0.74, y: 0.42, size: 0.62 },
          compact: { x: 0.78, y: 0.25, size: 0.36 },
          landscape: { x: 0.88, y: 0.8, size: 0.4 },
        },
        layout,
        "proud",
        beats(7),
      );
    default:
      return null;
  }
}

const FIELD = Object.fromEntries(TIMELINE.map((scene) => [scene.id, scene.field])) as Record<
  SceneId,
  (typeof TIMELINE)[number]["field"]
>;

/** Cell as a giant silhouette in the field's text colour (Backdrop.tsx). */
function giant(
  id: SceneId,
  sprite: SpriteId,
  layout: LayoutFamily,
  spots: Record<LayoutFamily, SilhouetteSpot>,
): ReactNode {
  return <Silhouette field={FIELD[id]} sprite={sprite} spot={spots[layout]} />;
}

/** GitHub motifs per scene: scattered cells everywhere, a branch graph where an edge is free. */
const BRANCH: Partial<Record<SceneId, "top" | "bottom">> = {
  contributions: "top",
  "tech-dna": "bottom",
  projects: "bottom",
  community: "top",
  engineering: "bottom",
  identity: "top",
};

/** The scene's backdrop and its Cell, drawn between the field and the text (Field.tsx). */
export function sceneAccent(id: SceneId, data: RecapData, layout: LayoutFamily): ReactNode {
  const field = FIELD[id];
  const edge = BRANCH[id];
  return (
    <>
      <CellScatter field={field} seed={id} count={layout === "landscape" ? 18 : 14} />
      {edge && <BranchLine field={field} edge={edge} />}
      {figure(id, data, layout)}
    </>
  );
}

/**
 * How Cell crosses the frame at the cut into each scene, in that scene's gear: alternating
 * directions, some in hops. None into the archetype reveal, which belongs to the flash.
 */
const DASHES: Partial<Record<SceneId, DashStyle>> = {
  contributions: { dir: "left" },
  rhythm: { dir: "right" },
  "tech-dna": { dir: "left", hop: true },
  projects: { dir: "right" },
  community: { dir: "left", hop: true },
  engineering: { dir: "right" },
  closing: { dir: "left" },
};

/** Cell running across the start of a scene, drawn above it (WrapStory). */
export function sceneDash(id: SceneId): ReactNode {
  const dash = DASHES[id];
  if (!dash || id === "identity") return null;
  return <CellDash dash={dash} />;
}
