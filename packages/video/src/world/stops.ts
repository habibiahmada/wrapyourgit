import type { RecapData } from "@wyg/schema";
import type { City } from "./city";

export type StopKind =
  | "hello"
  | "first-day"
  | "private"
  | "city"
  | "busiest"
  | "rhythm"
  | "languages"
  | "projects"
  | "community"
  | "engineering"
  | "archetype"
  | "versus"
  | "letter"
  | "closing";

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
 */
export function buildStops(
  data: RecapData,
  city: City,
  options: { letterPages?: number } = {},
): Stop[] {
  void data;
  const pages = Math.max(1, options.letterPages ?? 1);
  const last = city.lastDataIndex;
  const used = new Set<number>();

  const claim = (wanted: number, from = wanted): number => {
    let p = Math.max(0, Math.min(wanted, last));
    p = Math.max(p, Math.min(from, last));
    while (p <= last && used.has(p)) p++;
    if (p > last) {
      // Degenerate tiny year: take the earliest free plot instead of dropping a stop.
      p = 0;
      while (used.has(p)) p++;
    }
    used.add(p);
    return p;
  };

  // Natural dates claim first, in priority order, so a collision moves the less specific stop.
  const closing = claim(last);
  const hello = claim(0);
  const busiest = city.busiestIndex === null ? null : claim(city.busiestIndex);
  const firstDay = city.firstActiveIndex === null ? null : claim(city.firstActiveIndex);

  const fixedOrder: { id: string; kind: StopKind; page?: number }[] = [
    { id: "private", kind: "private" },
    { id: "rhythm", kind: "rhythm" },
    { id: "languages", kind: "languages" },
    { id: "projects", kind: "projects" },
    { id: "community", kind: "community" },
    { id: "engineering", kind: "engineering" },
    { id: "archetype", kind: "archetype" },
    { id: "versus", kind: "versus" },
    ...Array.from({ length: pages }, (_, i) => ({
      id: `letter-${i + 1}`,
      kind: "letter" as const,
      page: i + 1,
    })),
  ];
  if (firstDay === null) fixedOrder.unshift({ id: "first-day", kind: "first-day" });

  const n = fixedOrder.length;
  let lo = EDGE;
  let hi = last - EDGE;
  // A short provisional year can't hold the margins: use everything between hello and closing.
  if (hi - lo < n - 1) {
    lo = 1;
    hi = last - 1;
  }
  const fixedPlots = new Map<string, number>();
  let prev = -1;
  fixedOrder.forEach((stop, k) => {
    const target = n === 1 ? lo : lo + Math.round((k * (hi - lo)) / (n - 1));
    const plot = claim(target, Math.max(target, prev + 1));
    fixedPlots.set(stop.id, plot);
    prev = plot;
  });

  const at = (id: string): number => fixedPlots.get(id) as number;
  const stops: Stop[] = [
    { id: "hello", kind: "hello", plot: hello },
    {
      id: "first-day",
      kind: "first-day",
      plot: firstDay ?? at("first-day"),
    },
    { id: "private", kind: "private", plot: at("private") },
    { id: "city", kind: "city", plot: null },
  ];
  if (busiest !== null) stops.push({ id: "busiest", kind: "busiest", plot: busiest });
  for (const s of fixedOrder) {
    if (s.id === "first-day" || s.id === "private") continue;
    stops.push({ id: s.id, kind: s.kind, plot: at(s.id), ...(s.page ? { page: s.page } : {}) });
  }
  stops.push({ id: "closing", kind: "closing", plot: closing });
  return stops;
}
