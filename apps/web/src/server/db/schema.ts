import type { PreviousYearActivity } from "@wyg/github";
import type { RecapData } from "@wyg/schema";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * One row per GitHub account that signed in. The GitHub identity lives here directly (one GitHub
 * account per user in MVP), keyed by GitHub's numeric id because logins can be renamed.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    githubId: bigint("github_id", { mode: "number" }).notNull().unique(),
    login: text("login").notNull(),
    name: text("name"),
    avatarUrl: text("avatar_url").notNull(),
    /** Claimed atomically when a sync starts; enforces the cooldown even for parallel clicks. */
    syncStartedAt: timestamp("sync_started_at", { withTimezone: true }),
    /** Owner's choice for their own story and files; null until asked. Public pages always hide names. */
    showPrivateNames: boolean("show_private_names"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // /u/<login> must resolve to exactly one person, case-insensitively (see signInWithTokens).
  (table) => [uniqueIndex("users_login_lower_unique").on(sql`lower(${table.login})`)],
);

/**
 * GitHub App user tokens, AES-256-GCM encrypted (server/crypto.ts). Access tokens expire after
 * 8 h and are refreshed with the refresh token (6 months). Never selected into anything that
 * reaches the client.
 */
export const githubTokens = pgTable("github_tokens", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  accessExpiresAt: timestamp("access_expires_at", { withTimezone: true }),
  refreshToken: text("refresh_token"),
  refreshExpiresAt: timestamp("refresh_expires_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Sessions store a SHA-256 of the cookie value, so a database leak doesn't hand out sessions. */
export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One validated RecapData document per user and year (docs/architecture/overview.md). Stats are
 * not split into tables: everything is recomputable from GitHub and the schema is the contract.
 */
export const recaps = pgTable(
  "recaps",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    data: jsonb("data").$type<RecapData>().notNull(),
    isFinal: boolean("is_final").notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.year] })],
);

/**
 * A row means the user chose to publish that year's recap at /u/<login>. Sharing is opt-in and
 * off by default; deleting the row (or the user) takes the page down.
 */
export const recapShares = pgTable(
  "recap_shares",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.year] })],
);

/**
 * Public recaps of any GitHub user, fetched with the server's public token (server/public-recaps.ts),
 * keyed by GitHub's numeric id because logins can be renamed. `data` is already the public
 * projection. A row can exist before its first recap: it also holds the fetch claim.
 */
export const publicRecaps = pgTable(
  "public_recaps",
  {
    githubId: bigint("github_id", { mode: "number" }).primaryKey(),
    login: text("login").notNull(),
    data: jsonb("data").$type<RecapData>(),
    schemaVersion: integer("schema_version"),
    /** Last year's raw activity for the comparison: fetched once per account and kept. */
    previous: jsonb("previous").$type<PreviousYearActivity>(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }),
    /** Set while one request fetches this account; others wait for it instead of fetching too. */
    fetchingSince: timestamp("fetching_since", { withTimezone: true }),
  },
  // Visits look a recap up by login before asking GitHub; not unique, since logins get reused.
  (table) => [index("public_recaps_login_lower").on(sql`lower(${table.login})`)],
);

/** Accounts whose owner chose "Hide my public recap". By id, so a renamed login stays hidden. */
export const hiddenAccounts = pgTable("hidden_accounts", {
  githubId: bigint("github_id", { mode: "number" }).primaryKey(),
  hiddenAt: timestamp("hidden_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One row per public fetch a client started, for the per-client limit. `client` is a salted hash
 * of the address (public-policy.ts hashClient), never the address itself.
 */
export const publicLookups = pgTable(
  "public_lookups",
  {
    client: text("client").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("public_lookups_client_at").on(table.client, table.at)],
);
