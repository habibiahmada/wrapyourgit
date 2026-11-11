import { createHash } from "node:crypto";
import { GitHubApiError } from "@wyg/github";
import { comparisonSpanEnd } from "./sync-policy";

/*
 * Pure rules for public recaps: recaps of any GitHub user, fetched with the server's one public
 * token (5,000 points an hour, shared by every visitor). The numbers are the plan's decisions.
 */

/** A public recap younger than this is served as stored. */
export const PUBLIC_FRESH_MS = 12 * 60 * 60 * 1000;
/**
 * How old a stored recap may be and still stand in when no new fetch may start (client limit,
 * quota floor, busy GitHub). Privacy flags are frozen at fetch time, so an older copy could name a
 * repository its owner has since made private: past this, visitors get busy or limited instead.
 */
export const STALE_SERVE_MS = 7 * 24 * 60 * 60 * 1000;
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

export function canServeStale(fetchedAt: Date, now: Date): boolean {
  return now.getTime() - fetchedAt.getTime() < STALE_SERVE_MS;
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
 * last year as of its fetch, so it is fetched again whenever it ends before today's span end.
 * After the year that target stays at 31 December: a lagging span is fetched once more, then
 * kept for good. `through` is the stored span end (YYYY-MM-DD).
 */
export function previousIsCurrent(through: string | null, year: number, now: Date): boolean {
  if (through === null) return false;
  return through >= comparisonSpanEnd(year, now).toISOString().slice(0, 10);
}

/**
 * Whether GitHub refused for quota: GraphQL's primary limit comes back as an error of type
 * RATE_LIMITED, its secondary limits as HTTP 403 or 429. Visitors then get "busy", not "error".
 */
export function isRateLimited(error: unknown): boolean {
  if (!(error instanceof GitHubApiError)) return false;
  if (error.status === 403 || error.status === 429) return true;
  const details = Array.isArray(error.details) ? error.details : [];
  return details.some((item) => (item as { type?: unknown } | null)?.type === "RATE_LIMITED");
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
