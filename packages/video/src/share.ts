/**
 * The Projects chapter's waffle: each repository's share of the year's commits as whole squares
 * of a 10 × 10 grid (1 square = 1%). Pure, so it is unit-tested.
 *
 * The base is the year's commit total; if the top repositories add up to more (the two counts
 * come from different GitHub fields), the base is their sum, so shares never pass 100%.
 * Squares are handed out by largest remainder, so they always add up to exactly 100 and no
 * repository is rounded up at another's expense.
 */

export const SQUARES = 100;

export type ShareRow<T> = { item: T; commits: number; squares: number; percent: number };

export type CommitShares<T> = {
  /** The commits 100 squares stand for. */
  base: number;
  rows: ShareRow<T>[];
  /** Commits in every other repository. */
  other: { commits: number; squares: number; percent: number };
};

export function commitShares<T extends { commits: number }>(
  top: readonly T[],
  yearCommits: number,
  limit = 4,
): CommitShares<T> {
  const shown = top.slice(0, limit).filter((repo) => repo.commits > 0);
  const shownSum = shown.reduce((sum, repo) => sum + repo.commits, 0);
  const base = Math.max(yearCommits, shownSum);
  const otherCommits = base - shownSum;
  if (base === 0) {
    return { base, rows: [], other: { commits: 0, squares: 0, percent: 0 } };
  }

  const parts = [...shown.map((repo) => repo.commits), otherCommits];
  const exact = parts.map((commits) => (commits / base) * SQUARES);
  const squares = exact.map(Math.floor);
  let left = SQUARES - squares.reduce((sum, n) => sum + n, 0);
  // Largest remainder first; ties go to the earlier (bigger) repository.
  const order = exact
    .map((value, i) => ({ i, rest: value - Math.floor(value) }))
    .sort((a, b) => b.rest - a.rest || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    squares[i] = (squares[i] ?? 0) + 1;
    left -= 1;
  }

  const percent = (commits: number) => (commits / base) * 100;
  return {
    base,
    rows: shown.map((repo, i) => ({
      item: repo,
      commits: repo.commits,
      squares: squares[i] ?? 0,
      percent: percent(repo.commits),
    })),
    other: {
      commits: otherCommits,
      squares: squares[shown.length] ?? 0,
      percent: percent(otherCommits),
    },
  };
}

/**
 * The percent shown next to a repository: its squares, so the label always matches the picture
 * (within 1% of the exact share), or "<1%" for commits too few to earn a square.
 */
export function shareLabel(part: { squares: number; commits: number }): string {
  if (part.squares === 0 && part.commits > 0) return "<1%";
  return `${part.squares}%`;
}
