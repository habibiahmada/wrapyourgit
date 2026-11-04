"use client";

import { useActionState, useEffect, useState } from "react";
import { button } from "@/components/ui";
import { type SyncState, syncAction } from "./actions";

const MESSAGES: Record<Exclude<SyncState, { status: "idle" | "done" }>["kind"], string> = {
  "signed-out": "Your session ended. Sign in again to sync.",
  reauthorize: "Your GitHub sign-in expired. Sign in again, then sync.",
  "too-soon": "You synced a few minutes ago.",
  github: "GitHub didn't answer as expected. Try again in a minute.",
  unknown: "Something went wrong while building your recap. Try again in a minute.",
};

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/**
 * Sends the browser's timezone with the sync: days are dated by GitHub, but `periodEnd` and the
 * hour buckets use it (metrics.md). `retryAt` comes from the server when a sync was too recent.
 */
export function SyncForm({
  label,
  retryAt,
  variant = "primary",
}: {
  label: string;
  retryAt: string | null;
  /** Secondary when another call to action owns the screen (one primary per screen). */
  variant?: "primary" | "secondary";
}) {
  const [state, action, pending] = useActionState(syncAction, { status: "idle" });
  const [timezone, setTimezone] = useState("UTC");
  useEffect(() => setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone), []);

  const waitUntil = state.status === "error" && state.retryAt ? state.retryAt : retryAt;
  const blocked = waitUntil !== null && new Date(waitUntil) > new Date();

  return (
    <form action={action} className="flex flex-col items-start gap-3">
      <input type="hidden" name="timezone" value={timezone} />
      <button type="submit" className={button[variant]} disabled={pending || blocked}>
        {pending ? "Reading your GitHub activity…" : label}
      </button>
      <p role="status" aria-live="polite" className="min-h-6 text-base">
        {pending && "This takes about 20 seconds. Keep this tab open."}
        {!pending && state.status === "error" && (
          <>
            {MESSAGES[state.kind]}{" "}
            {(state.kind === "reauthorize" || state.kind === "signed-out") && (
              <a href="/api/auth/signin" className="font-bold underline underline-offset-4">
                Sign in with GitHub
              </a>
            )}
          </>
        )}
        {!pending && state.status !== "error" && blocked && waitUntil && (
          <>You can sync again at {time(waitUntil)}.</>
        )}
      </p>
    </form>
  );
}
