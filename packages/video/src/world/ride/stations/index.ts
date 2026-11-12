import type { StopKind } from "../../stops";
import { type Tone, toneOf } from "../palette";
import type { Box } from "../prims";
import { archetype } from "./archetype";
import { busiest } from "./busiest";
import { city } from "./city";
import { closing } from "./closing";
import { community } from "./community";
import { engineering } from "./engineering";
import { firstDay } from "./firstDay";
import { hello } from "./hello";
import { belt, type Station } from "./kit";
import { languages } from "./languages";
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
  closing,
};

/**
 * What rides the conveyor at the stops that do not lay one themselves (first-day, private and
 * busiest do, with loads that stand for their own figure): how many loads, and their colours.
 * Every stop is seen to be at work, and what moves goes somewhere.
 */
const LOADS: Partial<Record<StopKind, { count: number; tone: Tone; top?: string }>> = {
  // Cargo for the week's wagons.
  rhythm: { count: 7, tone: toneOf("#2ea043"), top: "#56d364" },
  // Lines of code.
  languages: { count: 8, tone: toneOf("#c9d1d9"), top: "#79c0ff" },
  // Crates, like the stacks.
  projects: { count: 7, tone: toneOf("#9a7550"), top: "#c8a57a" },
  // Stars on their way up.
  community: { count: 6, tone: toneOf("#e3b341"), top: "#ffd866" },
  // Each year's work, coming to be weighed.
  versus: { count: 7, tone: toneOf("#545d68"), top: "#2ea043" },
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
    if (!slab) return solids;
    const town = scenery(ctx, kind, slab.size[0], slab.size[1]);
    const load = LOADS[kind];
    // A conveyor only where the year has something to carry: an empty year's stops stand still.
    const busy = load && ctx.data.contributions.calendar.some((day) => day.count > 0);
    return busy
      ? [
          ...solids,
          ...town,
          ...belt(ctx, load.count, load.tone, load.top, [slab.size[0], slab.size[1]]),
        ]
      : [...solids, ...town];
  };

/** What each stop draws: its hero, and the town round its plaza. */
export const STATIONS: Partial<Record<StopKind, Station>> = Object.fromEntries(
  Object.entries(HEROES).map(([kind, station]) => [kind, inTown(kind as StopKind, station)]),
);
