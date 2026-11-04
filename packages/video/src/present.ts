import type { Metric, RepoRef } from "@wyg/schema";

/*
 * Presentation rules shared by scenes. Pure, so they're unit-tested without Remotion.
 */

/**
 * How a repository is named on screen. The story becomes a shareable MP4, so private repos are
 * never named (AGENTS.md rule 6), here at the last step before pixels, whatever the caller passed.
 */
export function repoLabel(repo: Pick<RepoRef, "nameWithOwner" | "isPrivate">): {
  name: string;
  owner: string | null;
} {
  if (repo.isPrivate) return { name: "Private repository", owner: null };
  const [owner = "", name = repo.nameWithOwner] = repo.nameWithOwner.split("/");
  return { name, owner };
}

/**
 * The number to show for a metric, or null when the beat should be skipped. Estimated values get
 * a "~" so the viewer can tell (scene-system rule 5); unavailable never becomes 0.
 */
export function metricValue(
  metric: Metric<number>,
  format: (value: number) => string,
): { text: string; estimated: boolean } | null {
  if (metric.status !== "ok") return null;
  return {
    text: `${metric.estimated ? "~" : ""}${format(metric.value)}`,
    estimated: metric.estimated,
  };
}
