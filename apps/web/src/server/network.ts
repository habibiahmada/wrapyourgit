/*
 * Telling "we couldn't reach GitHub" apart from a bug. Node's fetch (undici) throws a bare
 * TypeError("fetch failed") for every transport failure and puts the socket error in `cause`,
 * so without this a dropped connection is indistinguishable from a TypeError in our own code.
 */

const NETWORK_CODES = new Set([
  "EACCES",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENOTFOUND",
  "EPIPE",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
  "UND_ERR_SOCKET",
]);

function codeOf(value: unknown): string | null {
  const code = (value as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : null;
}

export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "TimeoutError" || error.name === "AbortError") return true;
  if (error instanceof TypeError && error.message === "fetch failed") return true;
  const code = codeOf(error) ?? codeOf(error.cause);
  return code !== null && NETWORK_CODES.has(code);
}

/** A short, log-safe label for a network failure: the socket code, or the error name. */
export function networkErrorCode(error: Error): string {
  return codeOf(error.cause) ?? codeOf(error) ?? error.name;
}
