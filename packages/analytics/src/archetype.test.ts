import { describe, expect, test } from "bun:test";
import { type ArchetypeSignals, classifyArchetype, nightShare } from "./archetype";

const quiet: ArchetypeSignals = {
  reposCreated: 0,
  ownRepoCommits: 0,
  activeDayShare: 0,
  longestStreak: 0,
  distinctLanguages: 0,
  reviews: 0,
  externalPullRequests: 0,
  nightShare: null,
  nightSample: 0,
  externalPublicRepos: 0,
};

describe("classifyArchetype", () => {
  test("a quiet year gets no archetype instead of a forced label", () => {
    const result = classifyArchetype(quiet);
    expect(result.archetype).toBeNull();
    expect(result.reasons).toEqual([]);
  });

  test("scores stay within 0..1 even for extreme years", () => {
    const { scores } = classifyArchetype({
      ...quiet,
      reposCreated: 500,
      ownRepoCommits: 100_000,
      activeDayShare: 1,
      longestStreak: 365,
      distinctLanguages: 40,
      reviews: 5000,
      externalPullRequests: 5000,
      nightShare: 1,
      nightSample: 5000,
      externalPublicRepos: 400,
    });
    for (const score of Object.values(scores)) {
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    }
  });

  test("a minimum not met means no score, even when another signal is high", () => {
    // 3 languages is under the explorer minimum of 4.
    const result = classifyArchetype({ ...quiet, distinctLanguages: 3 });
    expect(result.scores.explorer).toBeUndefined();
    expect(result.archetype).toBeNull();
  });

  test("the strongest qualifying archetype wins and its facts become the reasons", () => {
    // Shape of the maintainer's 2026 so far: mostly building in their own repos.
    const result = classifyArchetype({
      ...quiet,
      reposCreated: 13,
      ownRepoCommits: 2049,
      activeDayShare: 161 / 308,
      longestStreak: 66,
      distinctLanguages: 9,
      externalPullRequests: 8,
      nightShare: 152 / 715,
      nightSample: 715,
      externalPublicRepos: 10,
    });
    expect(result.archetype).toBe("builder");
    expect(result.reasons).toEqual([
      "2,049 commits to your own repositories",
      "13 new repositories this year",
    ]);
    expect(Object.keys(result.scores).sort()).toEqual([
      "builder",
      "consistent",
      "explorer",
      "open-sourcer",
    ]);
  });

  test("collaborator needs reviews or PRs to other people's repos", () => {
    const result = classifyArchetype({
      ...quiet,
      ownRepoCommits: 60,
      reviews: 45,
      externalPullRequests: 12,
    });
    expect(result.archetype).toBe("collaborator");
    expect(result.reasons).toEqual([
      "45 pull request reviews",
      "12 pull requests to other people's repositories",
    ]);
  });

  test("night owl needs a large enough sample, not just a high share", () => {
    expect(
      classifyArchetype({ ...quiet, nightShare: 0.9, nightSample: 20 }).scores["night-owl"],
    ).toBeUndefined();
    const owl = classifyArchetype({ ...quiet, nightShare: 0.55, nightSample: 120 });
    expect(owl.archetype).toBe("night-owl");
    expect(owl.reasons[0]).toBe("55% of sampled commits between 22:00 and 04:00");
  });

  test("reasons skip facts that are zero", () => {
    const result = classifyArchetype({ ...quiet, reposCreated: 4 });
    expect(result.archetype).toBe("builder");
    expect(result.reasons).toEqual(["4 new repositories this year"]);
  });

  test("ties go to the archetype listed first, so the result is stable", () => {
    const a = classifyArchetype({ ...quiet, distinctLanguages: 6, externalPublicRepos: 6 });
    const b = classifyArchetype({ ...quiet, externalPublicRepos: 6, distinctLanguages: 6 });
    expect(a.archetype).toBe(b.archetype);
  });
});

describe("nightShare", () => {
  test("counts 22:00 up to 04:00 as night", () => {
    const hours = Array(24).fill(0);
    hours[22] = 1;
    hours[3] = 1;
    hours[4] = 1;
    hours[12] = 1;
    expect(nightShare(hours)).toEqual({ share: 0.5, sample: 4 });
  });

  test("an empty sample has no share", () => {
    expect(nightShare(Array(24).fill(0))).toEqual({ share: null, sample: 0 });
  });
});
