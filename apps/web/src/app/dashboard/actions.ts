"use server";

import { GitHubApiError } from "@wyg/github";
import { refresh } from "next/cache";
import { getCurrentUser, ReauthorizeError } from "@/server/auth";
import { SyncTooSoonError, setShared, syncRecap } from "@/server/recaps";

export type SyncState =
  | { status: "idle" }
  | { status: "done" }
  | {
      status: "error";
      kind: "signed-out" | "reauthorize" | "too-soon" | "github" | "unknown";
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
    console.error("Sync failed", error instanceof Error ? error.message : error);
    return { status: "error", kind: error instanceof GitHubApiError ? "github" : "unknown" };
  }
  refresh();
  return { status: "done" };
}

/** Publishes or unpublishes the recap page. Re-checks the session; sharing is always opt-in. */
export async function setShareAction(form: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await setShared(user.id, form.get("share") === "on");
  refresh();
}
