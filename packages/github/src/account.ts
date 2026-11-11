import { githubGraphql } from "./client";

export type AccountLookup = (
  | { kind: "user"; id: number; login: string }
  | { kind: "organization"; login: string }
  | { kind: "missing" }
) & {
  /** GraphQL points left. */
  remaining: number;
  resetAt: string;
  /** REST core requests left (star history spends these); null or absent when unknown. */
  restRemaining?: number | null;
  /** GitHub's `github-authentication-token-expiration` header, when the token has one. */
  tokenExpiresAt?: string | null;
};

const ACCOUNT_QUERY = /* GraphQL */ `
  query Account($login: String!) {
    repositoryOwner(login: $login) {
      __typename
      login
      ... on User { databaseId }
    }
    rateLimit { remaining resetAt }
  }
`;

interface RawAccount {
  repositoryOwner: { __typename: string; login: string; databaseId?: number | null } | null;
  rateLimit: { remaining: number; resetAt: string };
}

export function toAccountLookup(data: RawAccount): AccountLookup {
  const { remaining, resetAt } = data.rateLimit;
  const owner = data.repositoryOwner;
  if (!owner) return { kind: "missing", remaining, resetAt };
  if (owner.__typename === "User" && typeof owner.databaseId === "number") {
    return { kind: "user", id: owner.databaseId, login: owner.login, remaining, resetAt };
  }
  if (owner.__typename === "Organization") {
    return { kind: "organization", login: owner.login, remaining, resetAt };
  }
  return { kind: "missing", remaining, resetAt };
}

/**
 * Who is this login (person, organisation, nobody), and how much quota the token has left. Two
 * calls side by side: the GraphQL lookup, and `/rate_limit`, which costs no quota and also carries
 * the token's expiry. The second is advisory: if it fails, its fields are null and the lookup
 * stands.
 */
export async function lookupAccount(token: string, login: string): Promise<AccountLookup> {
  const [data, quota] = await Promise.all([
    githubGraphql<RawAccount>(token, ACCOUNT_QUERY, { login }),
    restQuota(token),
  ]);
  return { ...toAccountLookup(data), ...quota };
}

async function restQuota(
  token: string,
): Promise<{ restRemaining: number | null; tokenExpiresAt: string | null }> {
  try {
    const response = await fetch("https://api.github.com/rate_limit", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "wrapyourgit",
      },
    });
    if (!response.ok) return { restRemaining: null, tokenExpiresAt: null };
    const body = (await response.json()) as { resources?: { core?: { remaining?: unknown } } };
    const remaining = body.resources?.core?.remaining;
    return {
      restRemaining: typeof remaining === "number" ? remaining : null,
      tokenExpiresAt: response.headers.get("github-authentication-token-expiration"),
    };
  } catch {
    return { restRemaining: null, tokenExpiresAt: null };
  }
}
