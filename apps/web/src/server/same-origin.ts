import "server-only";
import type { NextRequest } from "next/server";
import { appUrl } from "./auth";

/**
 * CSRF guard for state-changing route handlers, on top of SameSite=Lax cookies: the browser
 * always sends Origin on a cross-site POST, so a mismatch is rejected.
 */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return origin === new URL(appUrl()).origin;
}
