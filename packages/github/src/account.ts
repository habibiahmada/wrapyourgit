import { githubGraphql } from "./client";

export type AccountLookup = (
  | { kind: "user"; id: number; login: string }
  | { kind: "organization"; login: string }
  | { kind: "missing" }
) & { remaining: number; resetAt: string };

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

/** One cheap call: who is this login (person, organisation, nobody) and how much quota is left. */
export async function lookupAccount(token: string, login: string): Promise<AccountLookup> {
  return toAccountLookup(await githubGraphql<RawAccount>(token, ACCOUNT_QUERY, { login }));
}
