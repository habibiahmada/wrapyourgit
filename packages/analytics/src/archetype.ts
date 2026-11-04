import type { ArchetypeId } from "@wyg/schema";

/** Everything the archetype rules look at, already reduced to numbers (metrics.md, Archetypes). */
export interface ArchetypeSignals {
  reposCreated: number;
  ownRepoCommits: number;
  /** Active days / days in the period so far, 0..1. */
  activeDayShare: number;
  longestStreak: number;
  distinctLanguages: number;
  reviews: number;
  externalPullRequests: number;
  /** Share of sampled commits between 22:00 and 04:00 local; null when nothing was sampled. */
  nightShare: number | null;
  nightSample: number;
  externalPublicRepos: number;
}

export interface ArchetypeResult {
  archetype: ArchetypeId | null;
  scores: Partial<Record<ArchetypeId, number>>;
  reasons: string[];
}

interface Rule {
  id: ArchetypeId;
  /** The documented minimum. Below it the archetype gets no score at all. */
  qualifies: (s: ArchetypeSignals) => boolean;
  /**
   * Signal measured against what a strong year looks like (1 = strong). Comparable across
   * archetypes, which is what lets them compete; the reference values are tuned on real accounts.
   */
  strength: (s: ArchetypeSignals) => number;
  /** Facts shown under the archetype, most telling first. Zero-valued facts are dropped. */
  facts: (s: ArchetypeSignals) => [number, string][];
}

const fmt = (n: number) => n.toLocaleString("en-US");
const pct = (share: number) => `${Math.round(share * 100)}%`;

/** Order matters only for ties: the earlier rule wins, so results are stable. */
const RULES: Rule[] = [
  {
    id: "builder",
    qualifies: (s) => s.reposCreated >= 2 || s.ownRepoCommits >= 50,
    strength: (s) => Math.max(s.reposCreated / 10, s.ownRepoCommits / 500),
    facts: (s) => [
      [s.ownRepoCommits, `${fmt(s.ownRepoCommits)} commits to your own repositories`],
      [s.reposCreated, `${fmt(s.reposCreated)} new repositories this year`],
    ],
  },
  {
    id: "consistent",
    qualifies: (s) => s.activeDayShare >= 0.3,
    strength: (s) => (s.activeDayShare / 0.5 + s.longestStreak / 30) / 2,
    facts: (s) => [
      [s.activeDayShare, `Active on ${pct(s.activeDayShare)} of days`],
      [s.longestStreak, `A ${fmt(s.longestStreak)}-day streak`],
    ],
  },
  {
    id: "explorer",
    qualifies: (s) => s.distinctLanguages >= 4,
    strength: (s) => s.distinctLanguages / 6,
    facts: (s) => [[s.distinctLanguages, `${fmt(s.distinctLanguages)} languages in your commits`]],
  },
  {
    id: "collaborator",
    qualifies: (s) => s.reviews >= 10 || s.externalPullRequests >= 10,
    strength: (s) => (s.reviews + s.externalPullRequests) / 30,
    facts: (s) => [
      [s.reviews, `${fmt(s.reviews)} pull request reviews`],
      [
        s.externalPullRequests,
        `${fmt(s.externalPullRequests)} pull requests to other people's repositories`,
      ],
    ],
  },
  {
    id: "night-owl",
    qualifies: (s) => s.nightShare !== null && s.nightShare >= 0.4 && s.nightSample >= 50,
    strength: (s) => (s.nightShare ?? 0) / 0.4,
    facts: (s) => [
      [s.nightShare ?? 0, `${pct(s.nightShare ?? 0)} of sampled commits between 22:00 and 04:00`],
    ],
  },
  {
    id: "open-sourcer",
    qualifies: (s) => s.externalPublicRepos >= 3,
    strength: (s) => s.externalPublicRepos / 6,
    facts: (s) => [
      [
        s.externalPublicRepos,
        `Commits or pull requests in ${fmt(s.externalPublicRepos)} public repositories you don't own`,
      ],
    ],
  },
];

/**
 * Picks the strongest archetype whose minimum is met, or null ("your story is just beginning").
 * Strengths are unbounded; x / (1 + x) maps them into 0..1 without changing their order and
 * without two very strong archetypes both rounding to exactly 1.
 */
export function classifyArchetype(signals: ArchetypeSignals): ArchetypeResult {
  const scores: Partial<Record<ArchetypeId, number>> = {};
  let best: { rule: Rule; strength: number } | null = null;
  for (const rule of RULES) {
    if (!rule.qualifies(signals)) continue;
    const strength = rule.strength(signals);
    scores[rule.id] = strength / (1 + strength);
    if (!best || strength > best.strength) best = { rule, strength };
  }
  if (!best) return { archetype: null, scores, reasons: [] };
  const reasons = best.rule
    .facts(signals)
    .filter(([value]) => value > 0)
    .map(([, text]) => text);
  return { archetype: best.rule.id, scores, reasons };
}

const NIGHT_HOURS = new Set([22, 23, 0, 1, 2, 3]);

/** Share of commits in the night hours (22:00 up to 04:00) from a 24-bucket local histogram. */
export function nightShare(hourly: readonly number[]): { share: number | null; sample: number } {
  const sample = hourly.reduce((sum, count) => sum + count, 0);
  if (sample === 0) return { share: null, sample: 0 };
  const night = hourly.reduce((sum, count, hour) => sum + (NIGHT_HOURS.has(hour) ? count : 0), 0);
  return { share: night / sample, sample };
}
