import "server-only";
import { buildRecap, toPublicRecap } from "@wyg/analytics";
import { fetchYearActivity } from "@wyg/github";
import { EDITION_YEAR, type RecapData, recapDataSchema, SCHEMA_VERSION } from "@wyg/schema";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { getGithubToken } from "./auth";
import { db, recapShares, recaps, users } from "./db";
import { SYNC_COOLDOWN_MS, safeTimezone, yearRange } from "./sync-policy";

export interface StoredRecap {
  data: RecapData;
  syncedAt: Date;
}

export class SyncTooSoonError extends Error {
  constructor(readonly retryAt: Date) {
    super("Synced recently");
    this.name = "SyncTooSoonError";
  }
}

/**
 * The user's recap for the edition year. A row written by an older schema version is treated
 * as missing, so the user re-syncs instead of the story rendering a shape it doesn't expect.
 */
export async function getRecap(userId: string): Promise<StoredRecap | null> {
  const [row] = await db
    .select({ data: recaps.data, syncedAt: recaps.syncedAt, schemaVersion: recaps.schemaVersion })
    .from(recaps)
    .where(and(eq(recaps.userId, userId), eq(recaps.year, EDITION_YEAR)));
  if (!row || row.schemaVersion !== SCHEMA_VERSION) return null;
  return { data: row.data, syncedAt: row.syncedAt };
}

/** Fetch → compute → validate → store. Throws SyncTooSoonError inside the cooldown. */
export async function syncRecap(userId: string, timezone: unknown): Promise<StoredRecap> {
  // Claim the sync slot in one statement: of N parallel clicks, exactly one gets a row back.
  const cooldownSeconds = SYNC_COOLDOWN_MS / 1000;
  const [claimed] = await db
    .update(users)
    .set({ syncStartedAt: sql`now()` })
    .where(
      and(
        eq(users.id, userId),
        or(
          isNull(users.syncStartedAt),
          lt(users.syncStartedAt, sql`now() - make_interval(secs => ${cooldownSeconds})`),
        ),
      ),
    )
    .returning({ id: users.id });
  if (!claimed) {
    const [user] = await db
      .select({ syncStartedAt: users.syncStartedAt })
      .from(users)
      .where(eq(users.id, userId));
    const started = user?.syncStartedAt ?? new Date();
    throw new SyncTooSoonError(new Date(started.getTime() + SYNC_COOLDOWN_MS));
  }

  try {
    return await runSync(userId, timezone);
  } catch (error) {
    // A failed sync shouldn't lock the user out for the whole cooldown.
    await db.update(users).set({ syncStartedAt: null }).where(eq(users.id, userId));
    throw error;
  }
}

async function runSync(userId: string, timezone: unknown): Promise<StoredRecap> {
  const now = new Date();
  const token = await getGithubToken(userId);
  const { from, to } = yearRange(EDITION_YEAR);
  const activity = await fetchYearActivity(token, from, to);
  const data = recapDataSchema.parse(
    buildRecap(activity, { year: EDITION_YEAR, timezone: safeTimezone(timezone), now }),
  );

  const row = {
    schemaVersion: SCHEMA_VERSION,
    data,
    isFinal: data.meta.isFinal,
    syncedAt: now,
  };
  await db
    .insert(recaps)
    .values({ userId, year: EDITION_YEAR, ...row })
    .onConflictDoUpdate({ target: [recaps.userId, recaps.year], set: row });
  return { data, syncedAt: now };
}

/** Whether the user has published this year's recap. */
export async function isShared(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ userId: recapShares.userId })
    .from(recapShares)
    .where(and(eq(recapShares.userId, userId), eq(recapShares.year, EDITION_YEAR)));
  return Boolean(row);
}

export async function setShared(userId: string, shared: boolean): Promise<void> {
  if (shared) {
    await db.insert(recapShares).values({ userId, year: EDITION_YEAR }).onConflictDoNothing();
  } else {
    await db
      .delete(recapShares)
      .where(and(eq(recapShares.userId, userId), eq(recapShares.year, EDITION_YEAR)));
  }
}

/**
 * The public projection of a shared recap, looked up by GitHub login (case-insensitive), or null
 * when that login has no recap or hasn't shared it. Never returns the stored document.
 */
export async function getPublicRecap(
  login: string,
): Promise<{ userId: string; data: RecapData; syncedAt: Date } | null> {
  const [row] = await db
    .select({
      userId: users.id,
      data: recaps.data,
      schemaVersion: recaps.schemaVersion,
      syncedAt: recaps.syncedAt,
    })
    .from(users)
    .innerJoin(
      recapShares,
      and(eq(recapShares.userId, users.id), eq(recapShares.year, EDITION_YEAR)),
    )
    .innerJoin(recaps, and(eq(recaps.userId, users.id), eq(recaps.year, EDITION_YEAR)))
    .where(eq(sql`lower(${users.login})`, login.toLowerCase()))
    .limit(1);
  if (!row || row.schemaVersion !== SCHEMA_VERSION) return null;
  return { userId: row.userId, data: toPublicRecap(row.data), syncedAt: row.syncedAt };
}
