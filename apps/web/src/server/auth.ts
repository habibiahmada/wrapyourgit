import "server-only";
import { fetchViewer } from "@wyg/github";
import { and, eq, gt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { decrypt, encrypt, hashToken, parseKey, randomToken } from "./crypto";
import { db, githubTokens, sessions, users } from "./db";
import { requireEnv } from "./env";
import { refreshTokens, revokeGrant, type TokenSet, tokenState } from "./oauth";

/*
 * Data access layer for identity: sessions, the current user and their GitHub token. Every
 * route handler and server action re-checks the session here; nothing trusts the client.
 */

export const SESSION_COOKIE = "wyg_session";
/** Holds `<state>.<pkce verifier>` for the 10 minutes between sign-in start and callback. */
export const OAUTH_COOKIE = "wyg_oauth";
const SESSION_DAYS = 30;

export interface CurrentUser {
  id: string;
  login: string;
  name: string | null;
  avatarUrl: string;
}

/** The stored GitHub tokens can no longer be used; the user has to sign in again. */
export class ReauthorizeError extends Error {
  constructor() {
    super("GitHub authorization expired. Sign in again.");
    this.name = "ReauthorizeError";
  }
}

const encryptionKey = () => parseKey(requireEnv("TOKEN_ENCRYPTION_KEY"));
export const appUrl = () => requireEnv("APP_URL");
export const secureCookies = () => appUrl().startsWith("https://");
/** Public client ID: enough to start sign-in. */
export const githubClientId = () => requireEnv("GITHUB_APP_CLIENT_ID");
/** ID + secret: needed to exchange codes, refresh and revoke. */
export const githubApp = () => ({
  clientId: githubClientId(),
  clientSecret: requireEnv("GITHUB_APP_CLIENT_SECRET"),
});

/** Creates or updates the user from their GitHub identity and stores their tokens encrypted. */
export async function signInWithTokens(tokens: TokenSet): Promise<string> {
  const viewer = await fetchViewer(tokens.accessToken);
  const [user] = await db
    .insert(users)
    .values({
      githubId: viewer.databaseId,
      login: viewer.login,
      name: viewer.name,
      avatarUrl: viewer.avatarUrl,
    })
    .onConflictDoUpdate({
      target: users.githubId,
      set: { login: viewer.login, name: viewer.name, avatarUrl: viewer.avatarUrl },
    })
    .returning({ id: users.id });
  if (!user) throw new Error("User upsert returned no row");
  await saveTokens(user.id, tokens);
  return user.id;
}

async function saveTokens(userId: string, tokens: TokenSet): Promise<void> {
  const key = encryptionKey();
  const row = {
    accessToken: encrypt(tokens.accessToken, key),
    accessExpiresAt: tokens.accessExpiresAt,
    refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken, key) : null,
    refreshExpiresAt: tokens.refreshExpiresAt,
    updatedAt: new Date(),
  };
  await db
    .insert(githubTokens)
    .values({ userId, ...row })
    .onConflictDoUpdate({ target: githubTokens.userId, set: row });
}

/** Sets the session cookie. Call only from a route handler or server action. */
export async function startSession(userId: string): Promise<void> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** The signed-in user, or null. Reads cookies, so callers in pages sit behind <Suspense>. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ id: users.id, login: users.login, name: users.name, avatarUrl: users.avatarUrl })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    // Expiry is checked against the database clock, which also keeps `new Date()` out of render.
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, sql`now()`)))
    .limit(1);
  return row ?? null;
}

/** Deletes the session row and cookie. Call only from a route handler or server action. */
export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  store.delete(SESSION_COOKIE);
}

/** A usable GitHub access token for the user, refreshing it first when it is about to expire. */
export async function getGithubToken(userId: string): Promise<string> {
  const [row] = await db.select().from(githubTokens).where(eq(githubTokens.userId, userId));
  if (!row) throw new ReauthorizeError();
  const key = encryptionKey();
  const state = tokenState(
    {
      accessExpiresAt: row.accessExpiresAt,
      refreshToken: row.refreshToken,
      refreshExpiresAt: row.refreshExpiresAt,
    },
    new Date(),
  );
  if (state === "valid") return decrypt(row.accessToken, key);
  if (state === "reauthorize" || !row.refreshToken) throw new ReauthorizeError();

  const fresh = await refreshTokens({
    ...githubApp(),
    refreshToken: decrypt(row.refreshToken, key),
  }).catch(() => {
    throw new ReauthorizeError();
  });
  await saveTokens(userId, fresh);
  return fresh.accessToken;
}

/**
 * "Delete my data": revokes the app's grant on GitHub, then deletes the user. Sessions, tokens
 * and recaps go with it (ON DELETE CASCADE). Our data is deleted even when revocation can't be
 * done (tokens long expired); the return value tells the UI to point the user at GitHub settings.
 */
export async function deleteAccount(userId: string): Promise<{ revoked: boolean }> {
  let revoked = false;
  try {
    await revokeGrant({ ...githubApp(), accessToken: await getGithubToken(userId) });
    revoked = true;
  } catch {
    // Expired grant or GitHub unavailable: still delete everything we hold.
  }
  await db.delete(users).where(eq(users.id, userId));
  (await cookies()).delete(SESSION_COOKIE);
  return { revoked };
}
