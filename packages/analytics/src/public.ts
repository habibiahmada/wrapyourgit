import type { RecapData, RepoRef } from "@wyg/schema";

/**
 * The shareable projection of a recap (AGENTS.md rule 6). Anything that names a private
 * repository is removed; aggregate counts stay, because a count never identifies a repo. Every
 * public surface (public page, OG/PNG card) renders this, never the stored document.
 */
export function toPublicRecap(recap: RecapData): RecapData {
  const publicOnly = <T extends RepoRef>(repo: T | null): T | null =>
    repo && !repo.isPrivate ? repo : null;

  return {
    ...recap,
    repositories: {
      ...recap.repositories,
      top: recap.repositories.top.filter((repo) => !repo.isPrivate),
    },
    community: {
      ...recap.community,
      mostStarred: publicOnly(recap.community.mostStarred),
      mostStarredNew: publicOnly(recap.community.mostStarredNew),
      mostForked: publicOnly(recap.community.mostForked),
    },
  };
}
