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
  /** Opened minus merged, never below zero; when merged is unknown, everything sent. */
  inFlight: number;
  drawnFlying: number;
  drawnLanded: number;
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
  const inFlight = Math.max(0, sent - (merged ?? 0));
  const mergedRow: PlanesRow =
    prsMerged.status === "ok"
      ? { label: "landed (merged)", value: countText(prsMerged.value, prsMerged.estimated) }
      : { label: "merged: couldn't be read", value: null };
  return {
    sent,
    merged,
    reviews,
    inFlight,
    drawnFlying: Math.min(MAX_PLANES, inFlight),
    drawnLanded: Math.min(MAX_PLANES, merged ?? 0),
    empty: sent === 0 && (merged ?? 0) === 0,
    rows: [
      { label: plural(sent, "pull request sent", "pull requests sent"), value: formatCount(sent) },
      mergedRow,
      { label: plural(reviews, "review given", "reviews given"), value: formatCount(reviews) },
    ],
  };
}
