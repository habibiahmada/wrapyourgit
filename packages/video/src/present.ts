import {
  type ArchetypeId,
  type Metric,
  PRIVATE_REPO_NAME,
  type RecapData,
  type RepoRef,
} from "@wyg/schema";

/*
 * Presentation rules shared by scenes. Pure, so they're unit-tested without Remotion.
 */

/** Whether the projection anonymised this private repository: it has a rank, not a name. */
export function isAnonymised(repo: Pick<RepoRef, "nameWithOwner" | "isPrivate">): boolean {
  return repo.isPrivate && repo.nameWithOwner === PRIVATE_REPO_NAME;
}

/**
 * How a repository is named on screen: the name it is given, private or not. Privacy is enforced
 * before any scene sees the data, by the projection (ADR-0017): the owner's hidden view
 * (`withoutPrivateNames`) and every public surface (`toPublicRecap`) anonymise private
 * repositories, which read "Private repository" here, and the owner's "show" choice passes the
 * real names through on purpose. A second filter here would make that choice a no-op.
 */
export function repoLabel(repo: Pick<RepoRef, "nameWithOwner" | "isPrivate">): {
  name: string;
  owner: string | null;
} {
  if (isAnonymised(repo)) return { name: "Private repository", owner: null };
  const [owner = "", name = repo.nameWithOwner] = repo.nameWithOwner.split("/");
  return { name, owner };
}

/** Repositories that stand on the projects shelf at most. */
export const MAX_PROJECT_STACKS = 4;

/** The projects stop's repositories: those with commits, most commits first, at most four. */
export function shelfRepos<T extends { commits: number }>(top: readonly T[]): T[] {
  return top
    .filter((r) => r.commits > 0)
    .sort((a, b) => b.commits - a.commits)
    .slice(0, MAX_PROJECT_STACKS);
}

/** The repository the letter names as the year's main one, or null. */
export function letterRepo(data: RecapData): RepoRef | null {
  const repo = data.repositories.top[0];
  return repo && repo.commits > 0 ? repo : null;
}

/**
 * Whether the story draws a private repository's name: on the projects shelf or in the letter,
 * the only places a repository is named. An anonymised one draws no name. It decides the files'
 * reminder, so it must follow every scene: a new scene or letter line that names a repository
 * belongs here too.
 */
export function drawsPrivateName(data: RecapData): boolean {
  const named = (r: RepoRef | null) => r?.isPrivate === true && !isAnonymised(r);
  return shelfRepos(data.repositories.top).some(named) || named(letterRepo(data));
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

/**
 * Archetypes the person also qualified for, strongest first, excluding the winner: at most two,
 * and only those within reach of the winner (score at least 0.55), so "also" means something.
 */
export function runnerUps(identity: RecapData["identity"]): ArchetypeId[] {
  return (Object.entries(identity.scores) as [ArchetypeId, number][])
    .filter(([id, score]) => id !== identity.archetype && score >= 0.55)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([id]) => id);
}
