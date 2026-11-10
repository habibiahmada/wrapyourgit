import type { RecapData } from "@wyg/schema";
import { formatCount } from "../../theme";
import { countText } from "./sky.model";

/** Most planes drawn in the air and on the runway; the board carries the real numbers. */
export const MAX_PLANES = 12;

export type PlanesRow = { label: string; value: string | null };

export type PlanesModel = {
  sent: number;
  /** Null when GitHub could not say how many pull requests were merged. */
  merged: number | null;
  reviews: number;
  /**
   * Opened minus merged, never below zero. Null when merged is unknown: then nobody can say which
   * planes are still in the air, so the scene draws them only as "sent".
   */
  inFlight: number | null;
  drawnFlying: number;
  drawnLanded: number;
  /** What the picture shows, in words, for the scene's accessible title. */
  picture: string;
  /** Nothing sent and nothing landed: an empty runway with its own words. */
  empty: boolean;
  /** The three arrivals-board rows. A null value means the row is a sentence on its own. */
  rows: [PlanesRow, PlanesRow, PlanesRow];
};

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * Planes in flight are sent minus landed; landed planes are the merged ones. When merged is
 * unavailable nothing is drawn as landed (unavailable is not zero) and the row says so.
 */
export function planesModel(data: RecapData): PlanesModel {
  const { prsOpened: sent, prsMerged, reviews } = data.engineering;
  const merged = prsMerged.status === "ok" ? prsMerged.value : null;
  const inFlight = merged === null ? null : Math.max(0, sent - merged);
  const drawnFlying = Math.min(MAX_PLANES, inFlight ?? sent);
  const drawnLanded = Math.min(MAX_PLANES, merged ?? 0);
  const planes = (n: number) => `${formatCount(n)} ${plural(n, "paper plane", "paper planes")}`;
  const picture =
    inFlight === null
      ? `${sent === 0 ? "No paper planes" : planes(sent)} sent; merged couldn't be read`
      : `${drawnFlying > 0 ? `${planes(drawnFlying)} in the air` : "No paper planes in the air"}, ${drawnLanded} parked on the runway`;
  const mergedRow: PlanesRow =
    prsMerged.status === "ok"
      ? { label: "landed (merged)", value: countText(prsMerged.value, prsMerged.estimated) }
      : { label: "merged: couldn't be read", value: null };
  return {
    sent,
    merged,
    reviews,
    inFlight,
    drawnFlying,
    drawnLanded,
    picture,
    empty: sent === 0 && (merged ?? 0) === 0,
    rows: [
      { label: plural(sent, "pull request sent", "pull requests sent"), value: formatCount(sent) },
      mergedRow,
      { label: plural(reviews, "review given", "reviews given"), value: formatCount(reviews) },
    ],
  };
}
