const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

export class GitHubApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

/**
 * Minimal GraphQL client. Server-side only: the token must never reach the browser.
 * Each user's own token is used, so rate limits (5,000 points/hour) are per user.
 */
export async function githubGraphql<T>(
  token: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "wrapyourgit",
    },
    body: JSON.stringify({ query, variables }),
  });

  const body = (await response.json().catch(() => null)) as {
    data?: T;
    errors?: { message: string }[];
  } | null;

  if (!response.ok || !body || body.errors?.length) {
    const message = body?.errors?.map((e) => e.message).join("; ") ?? response.statusText;
    throw new GitHubApiError(message, response.status, body?.errors);
  }
  return body.data as T;
}
