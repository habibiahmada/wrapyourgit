import { GitHubApiError } from "@wyg/github";
import { OAuthError } from "./oauth";

/**
 * What may go into server logs about a failure: its kind and status code, never its message.
 * GitHub error messages can quote repository names (private ones included), and logs are kept
 * outside the user's control.
 */
export function errorSummary(error: unknown): string {
  if (error instanceof GitHubApiError) return `GitHubApiError status=${error.status}`;
  if (error instanceof OAuthError) return `OAuthError code=${error.code}`;
  if (error instanceof Error) return error.name;
  return typeof error;
}
