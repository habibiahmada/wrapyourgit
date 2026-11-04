import "server-only";
import { buildRecap } from "@wyg/analytics";
import { fetchYearActivity } from "@wyg/github";
import { EDITION_YEAR, type RecapData, recapDataSchema, SCHEMA_VERSION } from "@wyg/schema";
import { and, eq } from "drizzle-orm";
import { getGithubToken } from "./auth";
import { db, recaps } from "./db";
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
