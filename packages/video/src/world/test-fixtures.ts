import type { RecapData } from "@wyg/schema";

export function withMeta(data: RecapData, meta: Partial<RecapData["meta"]>): RecapData {
  return { ...data, meta: { ...data.meta, ...meta } };
}

export function withYear(data: RecapData, year: number): RecapData {
  return withMeta(data, {
    year,
    periodStart: `${year}-01-01`,
    periodEnd: `${year}-12-31`,
  });
}

/** Full-year calendar where every day is zero except the listed dates. */
export function withCalendar(data: RecapData, counts: Record<string, number>): RecapData {
  const start = Date.UTC(data.meta.year, 0, 1);
  const days = data.meta.year % 4 === 0 ? 366 : 365;
  const calendar = Array.from({ length: days }, (_, i) => {
    const date = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
    return { date, count: counts[date] ?? 0 };
  });
  return { ...data, contributions: { ...data.contributions, calendar } };
}
