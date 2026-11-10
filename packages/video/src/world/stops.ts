import type { RecapData } from "@wyg/schema";
import type { City } from "./city";

export const STOP_KINDS = [
  "hello",
  "first-day",
  "private",
  "city",
  "busiest",
  "rhythm",
  "languages",
  "projects",
  "community",
  "engineering",
  "archetype",
  "versus",
  "letter",
  "closing",
] as const;

export type StopKind = (typeof STOP_KINDS)[number];

export type Stop = {
  id: string;
  kind: StopKind;
  /** Plot index the stop lives on; null only for the city overview. */
  plot: number | null;
  /** 1-based, letter stops only. */
  page?: number;
};

/** Margin from either end of the year so fixed stops don't crowd hello and closing. */
const EDGE = 7;

/**
 * Closing is last in story order even though it sits on the last day with data: ending there
 * keeps the camera from flying back in time after the year is over.
 *
 * Plots never decrease along the story: first-day, busiest and closing keep their real dates, and
 * the fixed stops between two anchors are spread over the plots between them. The one exception
 * is a busiest day on Jan 1, where hello yields and moves forward. The letter's pages all share
 * one plot, so moving between them is a page turn, not a camera flight.
 */
export function buildStops(
  _data: RecapData,
  city: City,
  options: { letterPages?: number } = {},
): Stop[] {
  const pages = Math.max(1, options.letterPages ?? 1);
  const last = city.lastDataIndex;
  const used = new Set<number>();

  const take = (plot: number): number => {
    used.add(plot);
    return plot;
  };
  const firstFreeFrom = (plot: number): number => {
    let p = Math.max(0, plot);
    while (p <= last && used.has(p)) p++;
    if (p <= last) return p;
    // Degenerate tiny year: the earliest free plot beats dropping a stop.
    p = 0;
    while (used.has(p)) p++;
    return p;
  };
  const lastFreeUpTo = (plot: number): number => {
    for (let p = Math.min(plot, last); p >= 0; p--) if (!used.has(p)) return p;
    return firstFreeFrom(plot);
  };

  // Priority on a shared day: busiest, first-day, closing, then hello. Closing and first-day move
  // back (they stay after what precedes them), hello moves forward.
  const busiest = city.busiestIndex === null ? null : take(city.busiestIndex);
  const firstDay =
    city.firstActiveIndex === null ? null : take(lastFreeUpTo(city.firstActiveIndex));
  const closing = take(lastFreeUpTo(last));
  const hello = take(firstFreeFrom(0));

  type Entry = { id: string; kind: StopKind; page?: number; plot: number | null; fixed: boolean };
  // One entry takes a plot for the whole letter; the pages are expanded onto it at the end, so the
  // letter turns its pages in place instead of flying the camera between them.
  const letters: Entry[] = [{ id: "letter-1", kind: "letter", page: 1, plot: null, fixed: true }];
  const fixed = (kind: StopKind): Entry => ({ id: kind, kind, plot: null, fixed: true });
  const entries: Entry[] = [
    { id: "hello", kind: "hello", plot: hello, fixed: false },
    firstDay === null
      ? fixed("first-day")
      : { id: "first-day", kind: "first-day", plot: firstDay, fixed: false },
    fixed("private"),
    { id: "city", kind: "city", plot: null, fixed: false },
    ...(busiest === null
      ? []
      : [{ id: "busiest", kind: "busiest" as const, plot: busiest, fixed: false }]),
    fixed("rhythm"),
    fixed("languages"),
    fixed("projects"),
    fixed("community"),
    fixed("engineering"),
    fixed("archetype"),
    fixed("versus"),
    ...letters,
    { id: "closing", kind: "closing", plot: closing, fixed: false },
  ];

  const spread = (run: Entry[], lo: number, hi: number) => {
    let floor = lo;
    run.forEach((entry, k) => {
      const target = run.length === 1 ? lo : lo + Math.round((k * (hi - lo)) / (run.length - 1));
      entry.plot = take(firstFreeFrom(Math.max(target, floor)));
      floor = (entry.plot ?? floor) + 1;
    });
  };

  let prev = hello;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i] as Entry;
    if (!entry.fixed) {
      if (entry.plot !== null) prev = entry.plot;
      continue;
    }
    let end = i;
    while ((entries[end + 1] as Entry).fixed) end++;
    const run = entries.slice(i, end + 1);
    const next = (entries.slice(end + 1).find((e) => e.plot !== null) as Entry).plot as number;
    let lo = prev + 1;
    let hi = next - 1;
    if (hi - lo + 1 < run.length) {
      // No room between the anchors: spread over the whole year rather than stack stops.
      lo = 1;
      hi = last - 1;
    } else {
      // Keep clear of the year's edges where the segment has room.
      const mlo = Math.max(lo, EDGE);
      const mhi = Math.min(hi, last - EDGE);
      if (mhi - mlo + 1 >= run.length) {
        lo = mlo;
        hi = mhi;
      }
    }
    spread(run, lo, hi);
    prev = run[run.length - 1]?.plot ?? prev;
    i = end;
  }

  return entries.flatMap(({ id, kind, page, plot }): Stop[] =>
    kind === "letter"
      ? Array.from({ length: pages }, (_, i) => ({
          id: `letter-${i + 1}`,
          kind,
          plot,
          page: i + 1,
        }))
      : [{ id, kind, plot, ...(page ? { page } : {}) }],
  );
}
