import { NOT_SHARED_PUBLICLY, PRIVATE_REPO_NAME, type RecapData, type RepoRef } from "@wyg/schema";

export { PRIVATE_REPO_NAME };

/**
 * Only the names: nothing private stays identifiable, nothing else changes. The owner's own
 * "hide private names" view uses this, so their timezone and hours stay.
 *
 * Private entries of `repositories.top` keep their rank and commits under `PRIVATE_REPO_NAME`,
 * with every other identifying field cleared: dropping them would let the story credit the next
 * public repository as the year's main one, which would be false. Highlights and starred lists
 * name one repository each, so a private one there is dropped instead.
 */
export function withoutPrivateNames(recap: RecapData): RecapData {
  const anonymised = <T extends RepoRef>(repo: T): T =>
    repo.isPrivate
      ? {
          ...repo,
          nameWithOwner: PRIVATE_REPO_NAME,
          isFork: false,
          primaryLanguage: null,
          stars: 0,
          forks: 0,
          // A placeholder that says nothing about the repository: the start of the period.
          createdAt: `${recap.meta.periodStart}T00:00:00Z`,
        }
      : repo;
  const publicOnly = <T extends RepoRef>(repo: T | null): T | null =>
    repo && !repo.isPrivate ? repo : null;

  return {
    ...recap,
    repositories: {
      ...recap.repositories,
      top: recap.repositories.top.map(anonymised),
    },
    community: {
      ...recap.community,
      mostStarred: publicOnly(recap.community.mostStarred),
      mostStarredNew: publicOnly(recap.community.mostStarredNew),
      mostForked: publicOnly(recap.community.mostForked),
    },
    starred:
      recap.starred.status === "ok"
        ? {
            ...recap.starred,
            value: {
              ...recap.starred.value,
              top: recap.starred.value.top.filter((repo) => !repo.isPrivate),
            },
          }
        : recap.starred,
  };
}

/**
 * The shareable projection of a recap (AGENTS.md rule 6). Anything that names a private
 * repository is removed or anonymised; aggregate counts stay, because a count never identifies a repo. The
 * timezone and commit-hour histogram are withheld too: together they hint at where someone lives
 * and when they sleep, and no public scene needs them. For the same reason the night-owl score
 * (it inverts to the night share) and the night-owl reason (it names the hours) are dropped; the
 * archetype's label stays. Every public surface (public page, OG/PNG card) renders this, never the
 * stored document.
 */
export function toPublicRecap(recap: RecapData): RecapData {
  const named = withoutPrivateNames(recap);
  const { "night-owl": _nightShare, ...scores } = named.identity.scores;
  return {
    ...named,
    meta: { ...named.meta, timezone: "UTC" },
    contributions: {
      ...named.contributions,
      hourly: { status: "unavailable", reason: NOT_SHARED_PUBLICLY },
      // Another viewer's token reads 0 unless the owner shares the count, so 0 is not "none".
      privateCount:
        named.contributions.privateCount.status === "ok" &&
        named.contributions.privateCount.value === 0
          ? { status: "unavailable", reason: NOT_SHARED_PUBLICLY }
          : named.contributions.privateCount,
    },
    identity: {
      ...named.identity,
      scores,
      reasons: named.identity.archetype === "night-owl" ? [] : named.identity.reasons,
    },
  };
}
