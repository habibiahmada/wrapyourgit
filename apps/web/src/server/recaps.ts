import "server-only";
import { buildRecap, toPublicRecap } from "@wyg/analytics";
import { fetchYearActivity } from "@wyg/github";
import { EDITION_YEAR, type RecapData, recapDataSchema, SCHEMA_VERSION } from "@wyg/schema";
import { and, eq, sql } from "drizzle-orm";
import { getGithubToken } from "./auth";
import { db, recapShares, recaps, users } from "./db";
import { nextSyncAt, safeTimezone, yearRange } from "./sync-policy";

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
  const now = new Date();
  const existing = await getRecap(userId);
  const retryAt = nextSyncAt(existing?.syncedAt ?? null, now);
  if (retryAt) throw new SyncTooSoonError(retryAt);

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
export async function getPublicRecap(login: string): Promise<RecapData | null> {
  const [row] = await db
    .select({ data: recaps.data, schemaVersion: recaps.schemaVersion })
    .from(users)
    .innerJoin(
      recapShares,
      and(eq(recapShares.userId, users.id), eq(recapShares.year, EDITION_YEAR)),
    )
    .innerJoin(recaps, and(eq(recaps.userId, users.id), eq(recaps.year, EDITION_YEAR)))
    .where(eq(sql`lower(${users.login})`, login.toLowerCase()))
    .limit(1);
  if (!row || row.schemaVersion !== SCHEMA_VERSION) return null;
  return toPublicRecap(row.data);
}
