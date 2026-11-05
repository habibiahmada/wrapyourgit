import { describe, expect, test } from "bun:test";
import { commitShares, SQUARES, shareLabel } from "./share";

const repos = (...commits: number[]) => commits.map((n, i) => ({ name: `r${i}`, commits: n }));

describe("commitShares", () => {
  test("always hands out exactly 100 squares", () => {
    for (const [top, year] of [
      [repos(1652, 94, 57, 53, 34), 3712],
      [repos(312, 188, 96, 41, 12), 1284],
      [repos(1, 1, 1), 3],
      [repos(999), 1000],
    ] as const) {
      const shares = commitShares(top, year);
      const total = shares.rows.reduce((sum, row) => sum + row.squares, 0) + shares.other.squares;
      expect(total).toBe(SQUARES);
    }
  });

  test("keeps the top four and puts the rest in other", () => {
    const shares = commitShares(repos(1652, 94, 57, 53, 34), 3712);
    expect(shares.rows.map((row) => row.commits)).toEqual([1652, 94, 57, 53]);
    expect(shares.other.commits).toBe(3712 - 1652 - 94 - 57 - 53);
    // 44.5% gets 44 squares: the two smaller repos have larger remainders.
    expect(shares.rows[0]?.squares).toBe(44);
  });

  test("never passes 100% when the top repos outnumber the year total", () => {
    const shares = commitShares(repos(80, 40), 100);
    expect(shares.base).toBe(120);
    expect(shares.other.commits).toBe(0);
  });

  test("an empty year has no squares", () => {
    expect(commitShares([], 0)).toEqual({
      base: 0,
      rows: [],
      other: { commits: 0, squares: 0, percent: 0 },
    });
  });
});

test("shareLabel matches the squares, and a tiny share reads <1%", () => {
  expect(shareLabel({ squares: 44, commits: 1652 })).toBe("44%");
  expect(shareLabel({ squares: 0, commits: 3 })).toBe("<1%");
  expect(shareLabel({ squares: 0, commits: 0 })).toBe("0%");
});
