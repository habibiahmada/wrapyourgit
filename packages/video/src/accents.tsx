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
    case "intro":
      // Cell waves hello from the right edge while the first week lights up.
      return (
        <Accent
          art="cutout-cell-wave"
          at={beats(1)}
          enter="right"
          x={wide ? 0.86 : 0.84}
          y={tall ? 0.36 : 0.4}
          size={tall ? 1 : 0.72}
          rotate={-10}
        />
      );
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
      // Cell the runner and the ant as a huge silhouette, cut off by the right edge.
      return (
        <Accent
          art="skin-consistent"
          at={beats(8)}
          x={0.86}
          y={tall ? 0.5 : 0.55}
          size={tall ? 2.1 : 1.7}
          rotate={-8}
          silhouette="dark"
          opacity={0.1}
        />
      );
    case "tech-dna":
      // Thinking Cell peeks up from the bottom-right corner, clear of the footnote on the left.
      return (
        <Accent
          art="cutout-cell-think"
          at={beats(6)}
          enter="bottom"
          x={wide ? 0.93 : 0.92}
          y={tall ? 0.94 : 0.93}
          size={tall ? 0.6 : 0.42}
          rotate={8}
        />
      );
    case "projects":
      // The builder and the beaver as a giant silhouette leaning in from the right edge.
      return (
        <Accent
          art="skin-builder"
          at={beats(1)}
          x={0.9}
          y={tall ? 0.42 : 0.5}
          size={tall ? 2.3 : 1.8}
          rotate={7}
          silhouette="dark"
          opacity={0.09}
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
      // Cell with its headset and the bee, a big pale silhouette rising from the bottom edge.
      return (
        <Accent
          art="skin-collaborator"
          at={beats(2)}
          x={0.7}
          y={tall ? 0.78 : 0.72}
          size={tall ? 2.2 : 1.7}
          rotate={-5}
          silhouette="light"
          opacity={0.1}
        />
      );
    case "identity":
      // The climax: the archetype's own scene, big and in full colour.
      return data.identity.archetype ? (
        <Accent
          art={`skin-${data.identity.archetype}`}
          at={beats(3)}
          enter="bottom"
          x={wide ? 0.76 : 0.68}
          y={tall ? 0.84 : 0.84}
          size={tall ? 1.1 : 0.78}
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
