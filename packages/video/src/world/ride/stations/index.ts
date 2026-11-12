import type { StopKind } from "../../stops";
import type { Box } from "../prims";
import { archetype } from "./archetype";
import { busiest } from "./busiest";
import { city } from "./city";
import { closing } from "./closing";
import { community } from "./community";
import { engineering } from "./engineering";
import { firstDay } from "./firstDay";
import { hello } from "./hello";
import type { Station } from "./kit";
import { languages } from "./languages";
import { letter } from "./letter";
import { privateVault } from "./private";
import { projects } from "./projects";
import { rhythm } from "./rhythm";
import { scenery } from "./scenery";
import { versus } from "./versus";

/** The hero each stop builds. */
const HEROES: Partial<Record<StopKind, Station>> = {
  hello,
  "first-day": firstDay,
  private: privateVault,
  city,
  busiest,
  rhythm,
  languages,
  projects,
  community,
  engineering,
  archetype,
  versus,
  letter,
  closing,
};

/**
 * A station with the town round its plaza (scenery.ts): the plaza's own size says how far out
 * the town starts, so a station with a longer plaza needs to say nothing more.
 */
const inTown =
  (kind: StopKind, station: Station): Station =>
  (ctx) => {
    const solids = station(ctx);
    const slab = solids.find((s): s is Box => s.kind === "box" && s.tag === "plaza");
    return slab ? [...solids, ...scenery(ctx, kind, slab.size[0], slab.size[1])] : solids;
  };

/** What each stop draws: its hero, and the town round its plaza. */
export const STATIONS: Partial<Record<StopKind, Station>> = Object.fromEntries(
  Object.entries(HEROES).map(([kind, station]) => [kind, inTown(kind as StopKind, station)]),
);
