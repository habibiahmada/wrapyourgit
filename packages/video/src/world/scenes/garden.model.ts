import type { RecapData } from "@wyg/schema";
import { languageColor } from "../../languages";

export type GardenTree = {
  name: string;
  share: number;
  /** `Math.round(share × 100)`; a share that rounds to 0 reads "<1%" in `label`. */
  percent: number;
  label: string;
  color: string;
  /** √share, 0..1, so crown area reads as share; floored so a 1% language is still visible. */
  radius: number;
};

export type GardenModel = {
  trees: GardenTree[];
  /** Share not drawn as a tree, 0..1 (never negative). */
  other: number;
  /** "Everything else: 12%", or null when the rest is under 0.5%. */
  otherNote: string | null;
  empty: boolean;
  title: string;
  caption: string;
};

const MAX_TREES = 5;
const MIN_RADIUS = 0.12;
const OTHER_MIN = 0.005;

const percentLabel = (share: number) => {
  const percent = Math.round(share * 100);
  return percent === 0 ? "<1%" : `${percent}%`;
};

/**
 * Up to five trees for `languages.top`, in the given order (sorted by share). A language with no
 * colour of its own takes `languageColor`'s green, not the badge's ink, which would be a black crown.
 */
export function gardenModel(data: RecapData): GardenModel {
  const trees = data.languages.top.slice(0, MAX_TREES).map((l) => {
    const share = Math.max(0, l.share);
    return {
      name: l.name,
      share,
      percent: Math.round(share * 100),
      label: percentLabel(share),
      color: languageColor(l.color),
      radius: Math.max(MIN_RADIUS, Math.sqrt(share)),
    };
  });
  const first = trees[0];
  if (!first) {
    return {
      trees,
      other: 0,
      otherNote: null,
      empty: true,
      title: "No language data yet",
      caption: "Nothing to plant until commits land in a repo with a language",
    };
  }
  const other = Math.max(0, 1 - trees.reduce((sum, t) => sum + t.share, 0));
  return {
    trees,
    other,
    otherNote: other >= OTHER_MIN ? `Everything else: ${percentLabel(other)}` : null,
    empty: false,
    title: `Mostly ${first.name}`,
    caption: "share of your commits, weighted by repo language",
  };
}
