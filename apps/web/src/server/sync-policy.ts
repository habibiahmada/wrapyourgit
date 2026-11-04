/**
 * Pure rules for when a user may sync again. A full sync is ~23 GitHub requests on the user's
 * own rate limit (metrics.md, Spike A), and contribution data doesn't change by the second.
 */
export const SYNC_COOLDOWN_MS = 10 * 60 * 1000;

/** When the next sync is allowed, or null if it is allowed now. */
export function nextSyncAt(lastSyncedAt: Date | null, now: Date): Date | null {
  if (!lastSyncedAt) return null;
  const next = new Date(lastSyncedAt.getTime() + SYNC_COOLDOWN_MS);
  return next > now ? next : null;
}

/** Accepts only IANA zones the runtime knows; anything else falls back to UTC. */
export function safeTimezone(value: unknown): string {
  if (typeof value !== "string" || value.length > 64) return "UTC";
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/** The fetch window for an edition year: always the whole year (metrics.md, calendar days). */
export function yearRange(year: number): { from: Date; to: Date } {
  return { from: new Date(Date.UTC(year, 0, 1)), to: new Date(Date.UTC(year, 11, 31, 23, 59, 59)) };
}
