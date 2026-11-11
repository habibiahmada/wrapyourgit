import "server-only";
import { buildRecap, toPublicRecap } from "@wyg/analytics";
import {
  type AccountLookup,
  fetchPreviousYear,
  fetchYearActivity,
  lookupAccount,
  type PreviousYearActivity,
  type YearActivity,
} from "@wyg/github";
import { EDITION_YEAR, type RecapData, recapDataSchema, SCHEMA_VERSION } from "@wyg/schema";
import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { db, hiddenAccounts, publicLookups, publicRecaps } from "./db";
import { requireEnv } from "./env";
import { errorSummary } from "./log";
import {
  CLAIM_STALE_MS,
  CLIENT_WINDOW_MS,
  canServeStale,
  canStartFetch,
  claimIsStale,
  firstForwardedAddress,
  hashClient,
  isFresh,
  isRateLimited,
  lookupSalt,
  previousIsCurrent,
  underClientLimit,
} from "./public-policy";
import { comparisonSpanEnd, yearRange } from "./sync-policy";

export type PublicResult =
  | { kind: "recap"; login: string; data: RecapData }
  | { kind: "missing" | "organization" | "hidden" | "busy" | "limited" | "error"; login: string };

/** How often, and how long, a request waits for another request's fetch of the same account. */
const POLL_MS = 2_000;
const WAIT_MS = 60_000;

interface StoredRow {
  login: string;
  data: RecapData | null;
  schemaVersion: number | null;
  previous: PreviousYearActivity | null;
  fetchedAt: Date | null;
  fetchingSince: Date | null;
}

/** The database side of a public lookup; the seam the orchestration test replaces. */
export interface PublicStore {
  isHidden(githubId: number): Promise<boolean>;
  read(githubId: number): Promise<StoredRow | null>;
  /** The most recently fetched row whose login matches, ignoring case. */
  readByLogin(login: string): Promise<(StoredRow & { githubId: number }) | null>;
  /**
   * Checks the client's limit (public-policy.ts underClientLimit) and records one lookup, in one
   * step so a burst from one client can't all pass the check before any of them records. False,
   * with nothing recorded, when the client is at the limit. Every call also deletes every client's
   * expired rows (staleLookups), recorded or not.
   */
  admitLookup(client: string, now: Date): Promise<boolean>;
  /** Takes the fetch claim; returns the row as claimed, or null when another request holds it. */
  claim(githubId: number, login: string): Promise<StoredRow | null>;
  /**
   * Stores a fetched recap, stamps fetched_at and releases the claim. Like release, it only
   * touches the row while `claimedAt` is still its claim: a holder slower than CLAIM_STALE_MS,
   * whose claim was taken over, must not clear the new holder's.
   */
  save(
    githubId: number,
    claimedAt: Date,
    row: { login: string; data: RecapData; previous: PreviousYearActivity | null },
  ): Promise<void>;
  release(githubId: number, claimedAt: Date): Promise<void>;
}

export interface PublicDeps {
  lookup(login: string): Promise<AccountLookup>;
  fetchYear(login: string, from: Date, to: Date): Promise<YearActivity>;
  fetchPrevious(login: string, year: number, spanTo: Date): Promise<PreviousYearActivity>;
  store: PublicStore;
  now(): Date;
  sleep(ms: number): Promise<void>;
}

/**
 * The public recap of any GitHub user, as anyone may see it: always the public projection of a
 * fetch with the server's public token (it cannot see private repositories), built in UTC.
 * `client` is clientKey() of the request.
 */
export function loadPublicRecap(login: string, client: string): Promise<PublicResult> {
  return loadPublicRecapWith(defaultDeps, login, client);
}

export async function loadPublicRecapWith(
  deps: PublicDeps,
  requested: string,
  client: string,
): Promise<PublicResult> {
  const { store } = deps;
  let login = requested;
  // The stored recap that stands in whenever no new fetch may start (client limit, quota floor,
  // wait timeout, GitHub out of quota), but only while it is within the stale cap: past it, the
  // visitor gets the answer they would get with nothing stored. Hidden is asked again because the
  // owner may hide while this request waits for another one's fetch.
  let stale: { id: number; data: RecapData; fetchedAt: Date } | null = null;
  const standIn = async (otherwise: "busy" | "limited"): Promise<PublicResult> => {
    if (!stale || !canServeStale(stale.fetchedAt, deps.now())) return { kind: otherwise, login };
    if (await store.isHidden(stale.id)) return { kind: "hidden", login };
    return { kind: "recap", login, data: stale.data };
  };
  try {
    // A fresh recap stored under this login needs no GitHub call: it saves a point per view and
    // keeps cached pages working if the token expires. Hidden is checked by the stored id.
    const cached = usable(await store.readByLogin(requested));
    if (cached && isFresh(cached.fetchedAt, deps.now())) {
      return serveStored(store, cached);
    }

    // Every request that gets this far asks GitHub at least once (the lookup, maybe a fetch), and
    // lookups spend the shared token too: the client's limit is checked and one row recorded
    // before GitHub is asked, so unknown or renamed names can't drain it. Over the limit, a stale
    // stored recap within the cap still plays.
    if (!(await store.admitLookup(client, deps.now()))) {
      return cached && canServeStale(cached.fetchedAt, deps.now())
        ? serveStored(store, cached)
        : { kind: "limited", login };
    }

    const account = await deps.lookup(requested);
    if (account.kind === "missing") return { kind: "missing", login };
    if (account.kind === "organization") return { kind: "organization", login: account.login };
    login = account.login;
    if (await store.isHidden(account.id)) return { kind: "hidden", login };

    const stored = usable(await store.read(account.id));
    if (stored && isCurrent(stored, login, deps.now())) {
      return { kind: "recap", login, data: stored.data };
    }
    stale = stored && { id: account.id, data: stored.data, fetchedAt: stored.fetchedAt };

    if (!canStartFetch(account.remaining)) return await standIn("busy");

    const claimed = await store.claim(account.id, login);
    const claimedAt = claimed?.fetchingSince;
    if (!claimed || !claimedAt) {
      return (await waitForOtherFetch(deps, account.id, login)) ?? (await standIn("busy"));
    }
    // Another request may have saved between this request's read and its claim.
    const done = usable(claimed);
    if (done && isCurrent(done, login, deps.now())) {
      await store.release(account.id, claimedAt);
      return { kind: "recap", login, data: done.data };
    }

    try {
      const data = await fetchAndBuild(deps, login, claimed.previous);
      // The owner may have hidden the recap while it was being fetched: store nothing then.
      if (await store.isHidden(account.id)) {
        await store.release(account.id, claimedAt);
        return { kind: "hidden", login };
      }
      await store.save(account.id, claimedAt, { login, ...data });
      return { kind: "recap", login, data: data.data };
    } catch (error) {
      await store.release(account.id, claimedAt);
      throw error;
    }
  } catch (error) {
    console.warn(`public recap failed: ${errorSummary(error)}`);
    if (!isRateLimited(error)) return { kind: "error", login };
    try {
      return await standIn("busy");
    } catch {
      return { kind: "error", login };
    }
  }
}

/** A recap found by login, unless its owner hid it (checked by the stored id). */
async function serveStored(
  store: PublicStore,
  row: { githubId: number; login: string; data: RecapData },
): Promise<PublicResult> {
  if (await store.isHidden(row.githubId)) return { kind: "hidden", login: row.login };
  return { kind: "recap", login: row.login, data: row.data };
}

/**
 * Fresh, and fetched under the account's current login: after a rename the stored story, end screen
 * and share link still show the old one, so a renamed account is fetched again.
 */
function isCurrent(row: { data: RecapData; fetchedAt: Date }, login: string, now: Date): boolean {
  return isFresh(row.fetchedAt, now) && row.data.profile.login === login;
}

function usable<Row extends StoredRow>(
  row: Row | null,
): (Row & { data: RecapData; fetchedAt: Date }) | null {
  if (!row?.data || !row.fetchedAt || row.schemaVersion !== SCHEMA_VERSION) return null;
  return { ...row, data: row.data, fetchedAt: row.fetchedAt };
}

async function fetchAndBuild(
  deps: PublicDeps,
  login: string,
  storedPrevious: PreviousYearActivity | null,
): Promise<{ data: RecapData; previous: PreviousYearActivity | null }> {
  const now = deps.now();
  const { from, to } = yearRange(EDITION_YEAR);
  const activity = await deps.fetchYear(login, from, to);
  // Kept, and fetched again only while its span lags behind the year (previousIsCurrent). A failed
  // comparison never fails the fetch: the stored one stays, or last year is marked unavailable.
  const previous = previousIsCurrent(storedPrevious?.span.through ?? null, EDITION_YEAR, now)
    ? storedPrevious
    : await deps
        .fetchPrevious(login, EDITION_YEAR - 1, comparisonSpanEnd(EDITION_YEAR, now))
        .catch((error) => {
          console.warn(`public previous year fetch failed: ${errorSummary(error)}`);
          return storedPrevious;
        });
  const recap = buildRecap(
    { ...activity, previous },
    { year: EDITION_YEAR, timezone: "UTC", now, scope: "public" },
  );
  return { data: recapDataSchema.parse(toPublicRecap(recap)), previous };
}

/**
 * Another request holds the claim: wait for its result instead of spending quota on the same
 * account. Null when it doesn't finish within WAIT_MS or gives up without a recap.
 */
async function waitForOtherFetch(
  deps: PublicDeps,
  githubId: number,
  login: string,
): Promise<PublicResult | null> {
  const first = await deps.store.read(githubId);
  // The other fetch may have finished between our failed claim and this read.
  const done = usable(first);
  if (done && isFresh(done.fetchedAt, deps.now())) return { kind: "recap", login, data: done.data };
  const claimedAt = first?.fetchingSince;
  if (!claimedAt) return null;
  const deadline = deps.now().getTime() + WAIT_MS;
  while (deps.now().getTime() < deadline) {
    await deps.sleep(POLL_MS);
    const row = await deps.store.read(githubId);
    const stored = usable(row);
    if (stored && stored.fetchedAt > claimedAt) return { kind: "recap", login, data: stored.data };
    // Released without a recap, or the holder died: nothing more to wait for.
    if (!row?.fetchingSince || claimIsStale(row.fetchingSince, deps.now())) return null;
  }
  return null;
}

/** Whether the owner chose "Hide my public recap". */
export async function isHidden(githubId: number): Promise<boolean> {
  return dbStore.isHidden(githubId);
}

export async function setHidden(githubId: number, hidden: boolean): Promise<void> {
  if (hidden) {
    await db.insert(hiddenAccounts).values({ githubId }).onConflictDoNothing();
  } else {
    await db.delete(hiddenAccounts).where(eq(hiddenAccounts.githubId, githubId));
  }
}

export async function forgetPublicRecap(githubId: number): Promise<void> {
  await db.delete(publicRecaps).where(eq(publicRecaps.githubId, githubId));
}

/** The database side of the hide switch; the seam the test replaces. */
export interface HideStore {
  setHidden(githubId: number, hidden: boolean): Promise<void>;
  forget(githubId: number): Promise<void>;
}

/**
 * The "Hide my public recap" switch, also thrown by "Delete my data". Hiding deletes the stored
 * copy too, so nothing of it is left to serve if the switch goes off again.
 */
export async function setPublicRecapHidden(
  githubId: number,
  hidden: boolean,
  store: HideStore = { setHidden, forget: forgetPublicRecap },
): Promise<void> {
  await store.setHidden(githubId, hidden);
  if (hidden) await store.forget(githubId);
}

/**
 * Every client's lookup rows older than the window, for deletion. They count for nothing any
 * more, and deleting them for all clients (not only the one looking up now) is what keeps the
 * privacy page's promise: a hashed address is kept about an hour, even if it never returns.
 */
export function staleLookups(database: Pick<PgDatabase<PgQueryResultHKT>, "delete">, now: Date) {
  return database
    .delete(publicLookups)
    .where(lt(publicLookups.at, new Date(now.getTime() - CLIENT_WINDOW_MS)));
}

/** This client's lookup rows inside the window that starts at `since`. */
export function recentLookups(
  database: Pick<PgDatabase<PgQueryResultHKT>, "select">,
  client: string,
  since: Date,
) {
  return database
    .select({ count: sql<number>`count(*)::int` })
    .from(publicLookups)
    .where(and(eq(publicLookups.client, client), gt(publicLookups.at, since)));
}

/**
 * A transaction-scoped lock on one client's key, so that client's check and record run one at a
 * time; other clients don't wait. The first key keeps these locks apart from any others.
 */
export function lookupLock(client: string) {
  return sql`select pg_advisory_xact_lock(hashtext('public_lookups'), hashtext(${client}))`;
}

/** The per-client key for the lookup limit: a salted hash of the address, never the address. */
export function clientKey(headers: Headers): string {
  // On Vercel the platform sets x-forwarded-for itself, so its first address is the client's.
  // Behind a self-hosted proxy, the proxy must overwrite the header, or clients pick their bucket.
  return hashClient(
    firstForwardedAddress(headers.get("x-forwarded-for")),
    lookupSalt(requireEnv("TOKEN_ENCRYPTION_KEY")),
  );
}

const storedColumns = {
  login: publicRecaps.login,
  data: publicRecaps.data,
  schemaVersion: publicRecaps.schemaVersion,
  previous: publicRecaps.previous,
  fetchedAt: publicRecaps.fetchedAt,
  fetchingSince: publicRecaps.fetchingSince,
};

const dbStore: PublicStore = {
  async isHidden(githubId) {
    const [row] = await db
      .select({ githubId: hiddenAccounts.githubId })
      .from(hiddenAccounts)
      .where(eq(hiddenAccounts.githubId, githubId));
    return Boolean(row);
  },

  async read(githubId) {
    const [row] = await db
      .select(storedColumns)
      .from(publicRecaps)
      .where(eq(publicRecaps.githubId, githubId));
    return row ?? null;
  },

  async readByLogin(login) {
    const [row] = await db
      .select({ ...storedColumns, githubId: publicRecaps.githubId })
      .from(publicRecaps)
      .where(eq(sql`lower(${publicRecaps.login})`, login.toLowerCase()))
      .orderBy(sql`${publicRecaps.fetchedAt} desc nulls last`)
      .limit(1);
    return row ?? null;
  },

  async admitLookup(client, now) {
    return db.transaction(async (tx) => {
      await tx.execute(lookupLock(client));
      // Every check purges, even one that records nothing, so hashes don't outlive the window
      // just because no one new got through.
      await staleLookups(tx, now);
      // Read committed: this count sees every row committed by the lock's previous holder.
      const [row] = await recentLookups(tx, client, new Date(now.getTime() - CLIENT_WINDOW_MS));
      if (!underClientLimit(row?.count ?? 0)) return false;
      await tx.insert(publicLookups).values({ client });
      return true;
    });
  },

  async claim(githubId, login) {
    await db.insert(publicRecaps).values({ githubId, login }).onConflictDoNothing();
    // One statement: of N parallel requests for the same account, exactly one gets a row back.
    const staleSeconds = CLAIM_STALE_MS / 1000;
    const [row] = await db
      .update(publicRecaps)
      // Millisecond precision, so the claim time round-trips through a JS Date exactly and
      // save/release can match it.
      .set({ fetchingSince: sql`date_trunc('milliseconds', now())`, login })
      .where(
        and(
          eq(publicRecaps.githubId, githubId),
          or(
            isNull(publicRecaps.fetchingSince),
            lt(publicRecaps.fetchingSince, sql`now() - make_interval(secs => ${staleSeconds})`),
          ),
        ),
      )
      .returning(storedColumns);
    return row ?? null;
  },

  async save(githubId, claimedAt, { login, data, previous }) {
    await db
      .update(publicRecaps)
      .set({
        login,
        data,
        schemaVersion: SCHEMA_VERSION,
        previous,
        fetchedAt: sql`now()`,
        fetchingSince: null,
      })
      .where(and(eq(publicRecaps.githubId, githubId), eq(publicRecaps.fetchingSince, claimedAt)));
  },

  async release(githubId, claimedAt) {
    await db
      .update(publicRecaps)
      .set({ fetchingSince: null })
      .where(and(eq(publicRecaps.githubId, githubId), eq(publicRecaps.fetchingSince, claimedAt)));
  },
};

const publicToken = () => requireEnv("GITHUB_PUBLIC_TOKEN");

const defaultDeps: PublicDeps = {
  lookup: (login) => lookupAccount(publicToken(), login),
  fetchYear: (login, from, to) =>
    fetchYearActivity(publicToken(), from, to, {}, { kind: "user", login }),
  fetchPrevious: (login, year, spanTo) =>
    fetchPreviousYear(publicToken(), year, spanTo, { kind: "user", login }),
  store: dbStore,
  now: () => new Date(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};
