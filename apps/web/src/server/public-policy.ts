import { createHash } from "node:crypto";
import { comparisonSpanEnd, yearRange } from "./sync-policy";

/*
 * Pure rules for public recaps: recaps of any GitHub user, fetched with the server's one public
 * token (5,000 points an hour, shared by every visitor). The numbers are the plan's decisions.
 */

/** A public recap younger than this is served as stored. */
export const PUBLIC_FRESH_MS = 12 * 60 * 60 * 1000;
/** New fetches stop when GitHub reports fewer points than this left on the public token. */
export const QUOTA_FLOOR = 300;
/** New usernames one client may fetch per window. */
export const CLIENT_LIMIT = 20;
export const CLIENT_WINDOW_MS = 60 * 60 * 1000;
/** A fetch claim older than this belongs to a request that died; anyone may take it over. */
export const CLAIM_STALE_MS = 2 * 60 * 1000;

export function isFresh(fetchedAt: Date, now: Date): boolean {
  return now.getTime() - fetchedAt.getTime() < PUBLIC_FRESH_MS;
}

export function canStartFetch(remaining: number): boolean {
  return remaining >= QUOTA_FLOOR;
}

/** `recentLookups`: fetches this client started within the last CLIENT_WINDOW_MS. */
export function underClientLimit(recentLookups: number): boolean {
  return recentLookups < CLIENT_LIMIT;
}

export function claimIsStale(since: Date, now: Date): boolean {
  return now.getTime() - since.getTime() > CLAIM_STALE_MS;
}

/**
 * Whether last year's stored activity still serves the comparison. Its span runs to the same day
 * last year as of its fetch, so while the edition year runs it goes stale and is fetched again;
 * once the year is over it is kept for good. `through` is the stored span end (YYYY-MM-DD).
 */
export function previousIsCurrent(through: string | null, year: number, now: Date): boolean {
  if (through === null) return false;
  if (now > yearRange(year).to) return true;
  return through >= comparisonSpanEnd(year, now).toISOString().slice(0, 10);
}

/** The client's own address: the first hop of x-forwarded-for, which the platform sets. */
export function firstForwardedAddress(header: string | null): string {
  const first = header?.split(",")[0]?.trim();
  return first || "unknown";
}

/** A salted SHA-256, so the lookup log can count per client without storing an IP address. */
export function hashClient(address: string, salt: string): string {
  return createHash("sha256").update(salt).update("\0").update(address).digest("hex");
}
