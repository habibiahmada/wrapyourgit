import { describe, expect, test } from "bun:test";
import { commitReposQuery, OVERVIEW_QUERY, OWNED_REPOS_QUERY, quarterRanges } from "./activity";
import { subjectVariables, withSubject } from "./subject";

const octo = { kind: "user", login: "octo" } as const;

describe("withSubject", () => {
  test("adds $login to existing variables and aliases the root", () => {
    const out = withSubject(OVERVIEW_QUERY, octo);
    expect(out).toContain("query Overview($from: DateTime!, $to: DateTime!, $login: String!)");
    expect(out).toContain("viewer: user(login: $login) {");
    expect(out).not.toMatch(/(^|[^:\w] *)viewer\s*\{/m);
  });

  test("works for a query whose only variable is optional", () => {
    const out = withSubject(OWNED_REPOS_QUERY, octo);
    expect(out).toContain(
      "query OwnedRepos($after: String, $direction: OrderDirection!, $login: String!)",
    );
    expect(out).toContain("viewer: user(login: $login) {");
  });

  test("adds parentheses when the operation has none", () => {
    const out = withSubject("query Plain { viewer { id } }", octo);
    expect(out).toBe("query Plain($login: String!) { viewer: user(login: $login) { id } }");
  });

  test("aliases the dynamically built CommitRepos query", () => {
    const out = withSubject(commitReposQuery(quarterRanges(new Date(0), new Date(1e10))), octo);
    expect(out).toContain("query CommitRepos($login: String!) { viewer: user(login: $login) {");
  });

  test("leaves a viewer query unchanged", () => {
    expect(withSubject(OVERVIEW_QUERY, { kind: "viewer" })).toBe(OVERVIEW_QUERY);
  });
});

describe("subjectVariables", () => {
  test("is empty for the viewer and carries the login for a user", () => {
    expect(subjectVariables({ kind: "viewer" })).toEqual({});
    expect(subjectVariables(octo)).toEqual({ login: "octo" });
  });
});
