import { GitHubApiError } from "@wyg/github";
import { isNetworkError, networkErrorCode } from "./network";
import { OAuthError } from "./oauth";

/**
 * What may go into server logs about a failure: its kind and status code, never its message.
 * GitHub error messages can quote repository names (private ones included), and logs are kept
 * outside the user's control.
 */
export function errorSummary(error: unknown): string {
  if (error instanceof GitHubApiError) return `GitHubApiError status=${error.status}`;
  if (error instanceof OAuthError) return `OAuthError code=${error.code}`;
  // Socket codes like ETIMEDOUT carry no user data; the cause's message (it names the IP) is dropped.
  if (error instanceof Error && isNetworkError(error)) {
    return `NetworkError code=${networkErrorCode(error)}`;
  }
  if (error instanceof Error) return error.name;
  return typeof error;
}
