import type { RecapData } from "@wyg/schema";
import { sampleRecap } from "./sample-recap";

/** Edge cases every scene must survive (scene-system rule 6). Fake data, not real accounts. */

/** A year with no activity: zero counts, no streak, no busiest month, no languages. */
export const emptyRecap: RecapData = {
  ...sampleRecap,
  profile: { ...sampleRecap.profile, login: "quiet-year" },
  contributions: {
    ...sampleRecap.contributions,
    total: 0,
    commits: 0,
    activeDays: 0,
    longestStreak: { days: 0, start: null, end: null },
    busiestMonth: null,
    monthly: Array(12).fill(0),
    weekday: Array(7).fill(0),
    calendar: sampleRecap.contributions.calendar.map((day) => ({ ...day, count: 0 })),
  },
  languages: { top: [], distinctCount: 0 },
};

/** Long login and language names, five languages and a five-digit total. */
export const busyRecap: RecapData = {
  ...sampleRecap,
  profile: { ...sampleRecap.profile, login: "a-very-long-github-login-name" },
  contributions: {
    ...sampleRecap.contributions,
    total: 48_211,
    activeDays: 365,
    longestStreak: { days: 365, start: "2026-01-01", end: "2026-12-31" },
  },
  languages: {
    top: [
      { name: "Jupyter Notebook", color: null, share: 0.38 },
      { name: "Vim Script", color: null, share: 0.24 },
      { name: "TypeScript", color: null, share: 0.2 },
      { name: "Dockerfile", color: null, share: 0.12 },
      { name: "Shell", color: null, share: 0.006 },
    ],
    distinctCount: 9,
  },
};
