"use server";

import { GitHubApiError } from "@wyg/github";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, ReauthorizeError } from "@/server/auth";
import { errorSummary } from "@/server/log";
import { isNetworkError } from "@/server/network";
import { getRecap, SyncTooSoonError, setShared, syncRecap } from "@/server/recaps";
import { canPublish } from "@/server/sync-policy";

export type SyncState =
  | { status: "idle" }
  | { status: "done" }
  | {
      status: "error";
      kind: "signed-out" | "reauthorize" | "too-soon" | "network" | "github" | "unknown";
      retryAt?: string;
    };

/** Builds or refreshes the user's recap. Re-checks the session itself; never trusts the form. */
export async function syncAction(_previous: SyncState, form: FormData): Promise<SyncState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", kind: "signed-out" };
  try {
    await syncRecap(user.id, form.get("timezone"));
  } catch (error) {
    if (error instanceof ReauthorizeError) return { status: "error", kind: "reauthorize" };
    if (error instanceof SyncTooSoonError) {
      return { status: "error", kind: "too-soon", retryAt: error.retryAt.toISOString() };
    }
    console.error("Sync failed", errorSummary(error));
    if (isNetworkError(error)) return { status: "error", kind: "network" };
    return { status: "error", kind: error instanceof GitHubApiError ? "github" : "unknown" };
  }
  refresh();
  return { status: "done" };
}

/** Publishes or unpublishes the recap page. Re-checks the session; sharing is always opt-in. */
export async function setShareAction(form: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const share = form.get("share") === "on";
  if (share) {
    // Privacy flags are as of the last sync; publishing old data could name a repo made private
    // since then (security review M2).
    const recap = await getRecap(user.id);
    if (!canPublish(recap?.syncedAt ?? null, new Date())) redirect("/dashboard?share=stale");
  }
  await setShared(user.id, share);
  refresh();
}
