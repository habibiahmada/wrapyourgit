import type { PageInfo } from "./client";

export type Direction = "ASC" | "DESC";

/**
 * Lists a whole cursor connection by walking it from both ends at once until the walks meet.
 * A cursor connection can't jump ahead, so one walk takes as many round trips as it has pages
 * (sindresorhus' 1,132 repos: 12 pages, about 27 s). Two walks meeting in the middle take about
 * half. The first page is fetched alone, so a connection that fits in it costs one request.
 *
 * A walk stops when its connection ends, when it reaches an item the other walk already has, or
 * when together they hold `totalCount` items. Items are kept once by `key`.
 */
export async function walkFromBothEnds<T>(
  fetchPage: (
    direction: Direction,
    after: string | null,
  ) => Promise<{ items: T[]; pageInfo: PageInfo; totalCount: number }>,
  key: (item: T) => string,
): Promise<T[]> {
  const seen = new Map<string, T>();
  let total = Number.POSITIVE_INFINITY;

  /** Adds a page; true when this walk should go on. */
  const take = (page: { items: T[]; pageInfo: PageInfo; totalCount: number }): boolean => {
    total = page.totalCount;
    let met = false;
    for (const item of page.items) {
      const id = key(item);
      if (seen.has(id)) met = true;
      else seen.set(id, item);
    }
    return !met && page.pageInfo.hasNextPage && seen.size < total;
  };

  const first = await fetchPage("DESC", null);
  if (!take(first)) return [...seen.values()];

  const walk = async (direction: Direction, start: string | null) => {
    let after = start;
    for (;;) {
      if (seen.size >= total) return;
      const page = await fetchPage(direction, after);
      if (!take(page)) return;
      after = page.pageInfo.endCursor;
    }
  };
  await Promise.all([walk("DESC", first.pageInfo.endCursor), walk("ASC", null)]);
  return [...seen.values()];
}
