import type { LayoutFamily, RecapData } from "@wyg/schema";
import type { ReactNode } from "react";
import { beats } from "./audio/track";
import { Accent } from "./components/Accent";
import { LiveAccent } from "./components/LiveAccent";
import { ChibiCell } from "./three/ChibiCell";
import type { SceneId } from "./timeline";

/*
 * One illustration per scene, placed in the space that scene's layout leaves empty, so it is
 * large without covering a number or a label. Positions are tuned per layout family from rendered
 * stills of the sample and edge recaps (docs/video/scene-system.md). Full colour everywhere: the
 * faint silhouettes this replaced ended up hidden behind the numbers.
 */

type Spot = { x: number; y: number; size: number; rotate?: number };
type PerLayout = Record<LayoutFamily, Spot>;

const at = (layout: LayoutFamily, spots: PerLayout): Spot => spots[layout];

export function sceneAccent(id: SceneId, data: RecapData, layout: LayoutFamily): ReactNode {
  switch (id) {
    case "intro": {
      // Cell waves hello from the right while the first week lights up: live 3D, so the arm,
      // head, legs and eyes really move.
      const spot = at(layout, {
        portrait: { x: 0.72, y: 0.4, size: 0.95 },
        compact: { x: 0.76, y: 0.42, size: 0.75 },
        landscape: { x: 0.76, y: 0.46, size: 0.72 },
      });
      return (
        <LiveAccent at={beats(1)} enter="right" x={spot.x} y={spot.y} size={spot.size}>
          {(t) => <ChibiCell motion="wave" t={t} rotationY={-0.35} />}
        </LiveAccent>
      );
    }
    case "contributions": {
      // Cell cheers the big number from the empty side, clear of the stat chips.
      const spot = at(layout, {
        portrait: { x: 0.74, y: 0.5, size: 1.2, rotate: -12 },
        compact: { x: 0.78, y: 0.48, size: 0.85, rotate: -12 },
        landscape: { x: 0.82, y: 0.8, size: 0.62, rotate: -10 },
      });
      return <Accent art="cutout-cell-cheer" at={beats(2)} enter="right" idle="hop" {...spot} />;
    }
    case "rhythm": {
      // Cell the runner and the ant, in the gap between the calendar and the month.
      const spot = at(layout, {
        portrait: { x: 0.64, y: 0.82, size: 1.05 },
        compact: { x: 0.64, y: 0.46, size: 0.78 },
        landscape: { x: 0.5, y: 0.55, size: 0.78 },
      });
      return <Accent art="skin-consistent" at={beats(8)} enter="bottom" idle="run" {...spot} />;
    }
    case "tech-dna": {
      // Thinking Cell between the language name and the list.
      const spot = at(layout, {
        portrait: { x: 0.62, y: 0.5, size: 1.05, rotate: 6 },
        compact: { x: 0.84, y: 0.47, size: 0.5, rotate: 6 },
        landscape: { x: 0.24, y: 0.82, size: 0.5, rotate: 6 },
      });
      return <Accent art="cutout-cell-think" at={beats(6)} enter="bottom" idle="think" {...spot} />;
    }
    case "projects": {
      // The builder and the beaver, between the top repository and the list.
      const spot = at(layout, {
        portrait: { x: 0.56, y: 0.46, size: 1.15 },
        compact: { x: 0.62, y: 0.42, size: 0.75 },
        landscape: { x: 0.22, y: 0.8, size: 0.5 },
      });
      return <Accent art="skin-builder" at={beats(1)} enter="bottom" idle="hammer" {...spot} />;
    }
    case "community": {
      // Cell handing blocks to friends, in the open space beside the star count.
      const spot = at(layout, {
        portrait: { x: 0.56, y: 0.52, size: 1.45 },
        compact: { x: 0.66, y: 0.56, size: 0.9 },
        landscape: { x: 0.76, y: 0.36, size: 0.72 },
      });
      return (
        <Accent art="cutout-open-sourcer" at={beats(4)} enter="right" idle="float" {...spot} />
      );
    }
    case "engineering": {
      // Cell with its headset and the bee, below or beside the counters.
      const spot = at(layout, {
        portrait: { x: 0.58, y: 0.85, size: 1.1 },
        compact: { x: 0.74, y: 0.8, size: 0.68 },
        landscape: { x: 0.84, y: 0.84, size: 0.46 },
      });
      return (
        <Accent art="skin-collaborator" at={beats(2)} enter="bottom" idle="groove" {...spot} />
      );
    }
    case "identity": {
      // The climax: the person's own archetype, big and in full colour.
      const spot = at(layout, {
        portrait: { x: 0.62, y: 0.84, size: 1.1 },
        compact: { x: 0.68, y: 0.84, size: 0.78 },
        landscape: { x: 0.76, y: 0.72, size: 0.9 },
      });
      return (
        <Accent
          art={data.identity.archetype ? `skin-${data.identity.archetype}` : "cutout-cell-sleep"}
          at={beats(3)}
          enter="bottom"
          idle={data.identity.archetype ? "celebrate" : "breathe"}
          {...spot}
        />
      );
    }
    case "closing": {
      // A proud Cell rises from the bottom edge to sign off.
      const spot = at(layout, {
        portrait: { x: 0.78, y: 0.88, size: 0.9, rotate: -6 },
        compact: { x: 0.8, y: 0.86, size: 0.58, rotate: -6 },
        landscape: { x: 0.88, y: 0.84, size: 0.5, rotate: -6 },
      });
      return (
        <Accent art="cutout-cell-proud" at={beats(7)} enter="bottom" idle="breathe" {...spot} />
      );
    }
    default:
      return null;
  }
}
