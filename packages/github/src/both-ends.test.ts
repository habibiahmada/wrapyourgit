import { describe, expect, test } from "bun:test";
import { type Direction, walkFromBothEnds } from "./both-ends";

/** A fake cursor connection over `items` (already in ASC order), `size` per page. */
function connection(items: string[], size: number) {
  const requests: { direction: Direction; after: string | null }[] = [];
  const fetchPage = async (direction: Direction, after: string | null) => {
    requests.push({ direction, after });
    const ordered = direction === "ASC" ? items : [...items].reverse();
    const start = after ? Number(after) : 0;
    const page = ordered.slice(start, start + size);
    await new Promise((resolve) => setTimeout(resolve, 1));
    return {
      items: page,
      totalCount: items.length,
      pageInfo: { hasNextPage: start + size < items.length, endCursor: String(start + size) },
    };
  };
  return { fetchPage, requests };
}

const names = (n: number) => Array.from({ length: n }, (_, i) => `r${String(i).padStart(2, "0")}`);

describe("walkFromBothEnds", () => {
  test("one page is one request", async () => {
    const { fetchPage, requests } = connection(names(3), 5);
    const items = await walkFromBothEnds(fetchPage, (item) => item);
    expect([...items].sort()).toEqual(names(3));
    expect(requests).toHaveLength(1);
  });

  test("walks both ends at once until they meet: every item once, about half the rounds", async () => {
    const { fetchPage, requests } = connection(names(12), 2);
    const items = await walkFromBothEnds(fetchPage, (item) => item);
    expect([...items].sort()).toEqual(names(12));
    expect(new Set(items).size).toBe(12);
    expect(requests.some((r) => r.direction === "ASC")).toBe(true);
    // One walk alone would need 6 pages; meeting in the middle needs at most 7 requests,
    // spread over about half as many rounds.
    expect(requests.length).toBeLessThanOrEqual(7);
    expect(requests.filter((r) => r.direction === "DESC").length).toBeLessThanOrEqual(4);
  });

  test("an odd count with overlapping last pages still lists each item once", async () => {
    const { fetchPage } = connection(names(9), 4);
    const items = await walkFromBothEnds(fetchPage, (item) => item);
    expect([...items].sort()).toEqual(names(9));
  });
});
