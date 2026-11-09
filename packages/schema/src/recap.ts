import { z } from "zod";

/**
 * RecapData is the single contract between analytics (producer) and every
 * presentation surface (web story, video, PNG, public page).
 * Change it deliberately: bump SCHEMA_VERSION and update docs/analytics/metrics.md.
 */
export const SCHEMA_VERSION = 4;
export const EDITION_YEAR = 2026;

/**
 * A metric that may be missing. Missing data is shown as "unavailable", never as 0.
 * `estimated` marks values derived from partial data (e.g. commit hours from default branches only).
 */
export const metric = <T extends z.ZodType>(value: T) =>
  z.discriminatedUnion("status", [
    z.object({ status: z.literal("ok"), value, estimated: z.boolean().default(false) }),
    z.object({ status: z.literal("unavailable"), reason: z.string() }),
  ]);
export type Metric<T> =
  | { status: "ok"; value: T; estimated: boolean }
  | { status: "unavailable"; reason: string };

const isoDate = z.iso.date();

export const calendarDaySchema = z.object({
  date: isoDate,
  count: z.number().int().nonnegative(),
});

export const repoRefSchema = z.object({
  nameWithOwner: z.string(),
  /** Private repos must be redacted before anything becomes public: see toPublicRecap in @wyg/analytics. */
  isPrivate: z.boolean(),
  isFork: z.boolean(),
  primaryLanguage: z.string().nullable(),
  stars: z.number().int().nonnegative(),
  forks: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
});

const count = z.number().int().nonnegative();

/** The same counts for a span of the previous year, so years compare like for like. */
export const periodTotalsSchema = z.object({
  /** Last day included (inclusive). */
  through: isoDate,
  contributions: count,
  commits: count,
  pullRequests: count,
  issues: count,
  reviews: count,
  reposWithCommits: count,
  /** Contributions to private repos (count only), as GitHub reports them for the span. */
  privateCount: count,
  activeDays: count,
  longestStreak: count,
});

export const archetypeIdSchema = z.enum([
  "builder",
  "consistent",
  "explorer",
  "collaborator",
  "night-owl",
  "open-sourcer",
]);

export const recapDataSchema = z.object({
  meta: z.object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    year: z.number().int(),
    periodStart: isoDate,
    /** Last day covered. Before Dec 31 the recap is provisional. */
    periodEnd: isoDate,
    isFinal: z.boolean(),
    generatedAt: z.iso.datetime(),
    /**
     * IANA timezone used for periodEnd and hourly buckets. Calendar days come from GitHub, which
     * dates each commit by its own git timezone offset (docs/analytics/metrics.md).
     */
    timezone: z.string(),
  }),
  profile: z.object({
    login: z.string(),
    name: z.string().nullable(),
    avatarUrl: z.url(),
  }),
  contributions: z.object({
    total: z.number().int().nonnegative(),
    commits: z.number().int().nonnegative(),
    privateCount: metric(z.number().int().nonnegative()),
    activeDays: z.number().int().nonnegative(),
    longestStreak: z.object({
      days: z.number().int().nonnegative(),
      start: isoDate.nullable(),
      end: isoDate.nullable(),
    }),
    busiestMonth: z
      .object({ month: z.number().int().min(1).max(12), count: z.number().int() })
      .nullable(),
    busiestDay: z.object({ date: isoDate, count: z.number().int().nonnegative() }).nullable(),
    monthly: z.array(z.number().int().nonnegative()).length(12),
    /** Index 0 = Sunday. */
    weekday: z.array(z.number().int().nonnegative()).length(7),
    hourly: metric(z.array(z.number().int().nonnegative()).length(24)),
    calendar: z.array(calendarDaySchema),
  }),
  languages: z.object({
    /** Share is 0..1, weighted by the user's commits per repo × repo language bytes. */
    top: z.array(z.object({ name: z.string(), color: z.string().nullable(), share: z.number() })),
    distinctCount: z.number().int().nonnegative(),
  }),
  repositories: z.object({
    ownedTotal: z.number().int().nonnegative(),
    contributedTo: z.number().int().nonnegative(),
    createdThisYear: z.number().int().nonnegative(),
    top: z.array(repoRefSchema.extend({ commits: z.number().int().nonnegative() })),
  }),
  community: z.object({
    totalStars: z.number().int().nonnegative(),
    starsGained: metric(z.number().int().nonnegative()),
    totalForks: z.number().int().nonnegative(),
    forksGained: metric(z.number().int().nonnegative()),
    mostStarred: repoRefSchema.nullable(),
    mostStarredNew: repoRefSchema.nullable(),
    mostForked: repoRefSchema.nullable(),
  }),
  /**
   * Repositories the user starred during the period, anyone's. `top` are the five with the most
   * stargazers; `languages` counts starred repositories per primary language, most first.
   * Estimated when the page cap stopped the walk before the start of the period.
   */
  starred: metric(
    z.object({
      count,
      top: z.array(repoRefSchema).max(5),
      languages: z.array(z.object({ name: z.string(), count })).max(5),
    }),
  ),
  engineering: z.object({
    prsOpened: z.number().int().nonnegative(),
    prsMerged: metric(z.number().int().nonnegative()),
    issuesOpened: z.number().int().nonnegative(),
    issuesClosed: metric(z.number().int().nonnegative()),
    reviews: z.number().int().nonnegative(),
    /** Repos not owned by the user that received their PRs/commits. */
    externalRepos: z.number().int().nonnegative(),
  }),
  /**
   * Last year for comparison. `sameSpan` stops on the same day of the year as this recap's
   * `periodEnd`, so a recap in November compares with last January to November. `fullYear` is
   * all of last year. Unavailable when GitHub could not be asked (metrics.md).
   */
  previousYear: metric(
    z.object({
      year: z.number().int(),
      sameSpan: periodTotalsSchema,
      fullYear: z.object({ contributions: count, activeDays: count, longestStreak: count }),
    }),
  ),
  identity: z.object({
    /** Null when there is not enough activity to classify fairly. */
    archetype: archetypeIdSchema.nullable(),
    scores: z.partialRecord(archetypeIdSchema, z.number()),
    /** Human-readable evidence shown under the archetype ("You were active on 186 days"). */
    reasons: z.array(z.string()),
  }),
});

export type RecapData = z.infer<typeof recapDataSchema>;
export type CalendarDay = z.infer<typeof calendarDaySchema>;
export type RepoRef = z.infer<typeof repoRefSchema>;
export type PeriodTotals = z.infer<typeof periodTotalsSchema>;
export type ArchetypeId = z.infer<typeof archetypeIdSchema>;
