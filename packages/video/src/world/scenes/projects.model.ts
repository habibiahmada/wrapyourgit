import type { RecapData } from "@wyg/schema";
import { isAnonymised, repoLabel, shelfRepos } from "../../present";
import { formatCount } from "../../theme";
import { labelWidth } from "./fit";

export type ProjectStack = {
  label: string;
  commits: number;
  crates: number;
};

export type ProjectsModel = {
  stacks: ProjectStack[];
  /** Commits one crate stands for. */
  unit: number;
  /** `repositories.createdThisYear`. */
  created: number;
  empty: boolean;
  title: string;
  /** "6 new repositories this year", or null when none were created. */
  subtitle: string | null;
  /** "one crate ≈ 50 commits", or null on an empty shelf. */
  legend: string | null;
};

const MAX_CRATES = 8;
const UNITS = [10, 25, 50, 100, 250, 500];

export const commitsText = (n: number) => `${formatCount(n)} ${n === 1 ? "commit" : "commits"}`;

function subtitleFor(created: number): string | null {
  if (created === 0) return null;
  return created === 1
    ? "1 new repository this year"
    : `${formatCount(created)} new repositories this year`;
}

/**
 * Crates per stack are `ceil(commits / unit)`. The unit is the smallest of a fixed ladder that
 * keeps the tallest stack at 8 crates or fewer; past the ladder it stays 500 and the stack grows,
 * because a bigger crate would make the legend promise something the picture doesn't show.
 */
export function projectsModel(data: RecapData): ProjectsModel {
  const { top, createdThisYear } = data.repositories;
  // Sorted so the tallest stack is first (Cell stands by it) whatever order analytics gave.
  const picked = shelfRepos(top);
  const tallest = Math.max(0, ...picked.map((r) => r.commits));
  const unit =
    UNITS.find((u) => Math.ceil(tallest / u) <= MAX_CRATES) ?? (UNITS[UNITS.length - 1] as number);
  // Several unnamed private stacks would read as one repository repeated: number them instead.
  const unnamed = picked.filter(isAnonymised).length;
  let nth = 0;
  const stacks = picked.map((r) => ({
    label: unnamed > 1 && isAnonymised(r) ? `${repoLabel(r).name} ${++nth}` : repoLabel(r).name,
    commits: r.commits,
    crates: Math.ceil(r.commits / unit),
  }));
  if (stacks.length === 0) {
    return {
      stacks,
      unit,
      created: createdThisYear,
      empty: true,
      title: "No repository commits yet",
      subtitle: null,
      legend: null,
    };
  }
  return {
    stacks,
    unit,
    created: createdThisYear,
    empty: false,
    title: "Where your commits went",
    subtitle: subtitleFor(createdThisYear),
    legend: `one crate ≈ ${formatCount(unit)} commits`,
  };
}

/** `text` cut to end in "…" so it fits `maxWidth` at `size`; unchanged when it already fits. */
export function truncateLabel(
  text: string,
  size: number,
  weight: 400 | 700 | 800,
  maxWidth: number,
): string {
  if (labelWidth(text, size, weight) <= maxWidth) return text;
  let end = text.length - 1;
  while (end > 1 && labelWidth(`${text.slice(0, end)}…`, size, weight) > maxWidth) end--;
  return `${text.slice(0, end).trimEnd()}…`;
}
