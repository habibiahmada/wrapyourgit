import type { RecapData } from "@wyg/schema";
import type { City } from "../city";
import { buildStops, type Stop, type StopKind } from "../stops";
import { stationPlace } from "./track";

/** The stops this build can draw. Phase 2 of the story ride grows it to every StopKind. */
export const RIDE_KINDS: readonly StopKind[] = [
  "hello",
  "city",
  "languages",
  "projects",
  "closing",
];

/** Stops that tell their chapter without a plaza beside the rail. */
const NO_PLAZA: readonly StopKind[] = ["hello", "city", "closing"];

export type RideStop = Stop & {
  /** Where the train rests, as a distance along the rail. */
  s: number;
  /** Which side of the rail its plaza is on: 1 is the right. */
  side: 1 | -1;
  plaza: boolean;
};

/**
 * The story's stops in their order (`buildStops`), each with a place on the rail. The plots
 * `buildStops` assigns are not used for position: stations stand at even intervals, because real
 * dates can be days apart and a station needs room (spec "Stations"). The city overview has no
 * station of its own and waits halfway between its neighbours; a letter's pages share one place.
 */
export function rideStops(
  data: RecapData,
  city: City,
  options: { letterPages?: number; letter?: boolean } = {},
): RideStop[] {
  const stops = buildStops(data, city, options).filter((stop) => RIDE_KINDS.includes(stop.kind));
  const weeks = Math.max(...city.plots.map((plot) => plot.col)) + 1;
  const takesPlace = (stop: Stop) => stop.kind !== "city" && (stop.page ?? 1) === 1;
  const count = stops.filter(takesPlace).length;

  let index = -1;
  const placed = stops.map((stop) => {
    if (takesPlace(stop)) index++;
    return stop.kind === "city" ? null : stationPlace(Math.max(0, index), count, weeks);
  });
  return stops.map((stop, i) => {
    const place = placed[i];
    const plaza = !NO_PLAZA.includes(stop.kind);
    if (place) return { ...stop, s: place.s, side: place.side, plaza };
    const before = placed.slice(0, i).findLast((p) => p !== null);
    const after = placed.slice(i + 1).find((p) => p !== null);
    const s = before && after ? (before.s + after.s) / 2 : ((before ?? after)?.s ?? 0);
    return { ...stop, s, side: 1, plaza };
  });
}
