import type { LayoutFamily, RecapData } from "@wyg/schema";
import type { ReactNode } from "react";
import { beats } from "./audio/track";
import { Accent } from "./components/Accent";
import type { SceneId } from "./timeline";

/*
 * One illustration per scene, each used differently so the story doesn't repeat one picture:
 * Cell peeking from an edge, a faint silhouette behind the numbers, a character in a corner, and
 * the full archetype only at the climax. Positions are fractions of the frame, per layout family.
 * Silhouettes stay at low opacity so text contrast is unaffected (R-25).
 */
export function sceneAccent(id: SceneId, data: RecapData, layout: LayoutFamily): ReactNode {
  const wide = layout === "landscape";
  const tall = layout === "portrait";
  switch (id) {
    case "contributions":
      // Cell leans in from the right edge to cheer the big number.
      return (
        <Accent
          art="cutout-cell-cheer"
          at={beats(2)}
          enter="right"
          x={wide ? 0.9 : 0.86}
          y={tall ? 0.46 : 0.42}
          size={tall ? 0.95 : 0.7}
          rotate={-14}
        />
      );
    case "rhythm":
      // The steady staircase as a faint silhouette under the weekday bars.
      return (
        <Accent
          art="cutout-consistent"
          at={beats(8)}
          x={0.7}
          y={tall ? 0.86 : 0.8}
          size={tall ? 1.3 : 1}
          silhouette="dark"
          opacity={0.07}
        />
      );
    case "tech-dna":
      // Thinking Cell peeks up from the bottom-right corner, clear of the footnote on the left.
      return (
        <Accent
          art="cutout-cell-think"
          at={beats(6)}
          enter="bottom"
          x={wide ? 0.9 : 0.86}
          y={tall ? 0.9 : 0.86}
          size={tall ? 0.8 : 0.55}
          rotate={8}
        />
      );
    case "projects":
      // The builder's crane and city, as a skyline silhouette behind the list.
      return (
        <Accent
          art="cutout-builder"
          at={beats(1)}
          x={0.72}
          y={tall ? 0.36 : 0.5}
          size={tall ? 1.4 : 1.1}
          silhouette="dark"
          opacity={0.08}
        />
      );
    case "community":
      // Cell handing out blocks, full colour, in the lower right.
      return (
        <Accent
          art="cutout-open-sourcer"
          at={beats(4)}
          enter="right"
          x={wide ? 0.8 : 0.72}
          y={tall ? 0.42 : 0.4}
          size={tall ? 1 : 0.75}
        />
      );
    case "engineering":
      // Two Cells passing work along, faint, behind the counters.
      return (
        <Accent
          art="cutout-collaborator"
          at={beats(2)}
          x={0.62}
          y={0.6}
          size={tall ? 1.4 : 1.05}
          silhouette="light"
          opacity={0.08}
        />
      );
    case "identity":
      // The climax: the archetype's own scene, big and in full colour.
      return data.identity.archetype ? (
        <Accent
          art={`cutout-${data.identity.archetype}`}
          at={beats(3)}
          enter="bottom"
          x={wide ? 0.74 : 0.6}
          y={tall ? 0.8 : 0.72}
          size={tall ? 1.15 : 0.85}
        />
      ) : (
        <Accent art="cutout-cell-sleep" at={beats(3)} enter="bottom" x={0.7} y={0.8} size={0.7} />
      );
    case "closing":
      // A proud Cell rises from the bottom edge to sign off.
      return (
        <Accent
          art="cutout-cell-proud"
          at={beats(7)}
          enter="bottom"
          x={wide ? 0.86 : 0.8}
          y={tall ? 0.9 : 0.86}
          size={tall ? 0.75 : 0.5}
          rotate={-6}
        />
      );
    default:
      return null;
  }
}
