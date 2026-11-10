"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { setPrivateNamesChoice } from "@/server/privacy";
import { safeRedirect } from "./safe-redirect";

/** Saves the answer to "Show your private repository names?". Re-checks the session itself. */
export async function setPrivateNamesAction(form: FormData): Promise<void> {
  const user = await getCurrentUser();
  // A session that expired while the question was open: back to the front door, not a dead form.
  if (!user) redirect("/");
  const show = form.get("show");
  // Only the two buttons' values count; anything else leaves the question unanswered.
  if (show !== "yes" && show !== "no") return;
  await setPrivateNamesChoice(user.id, show === "yes");
  // Settings asks from its own page and stays there; the story's question just re-renders in place.
  const back = safeRedirect(form.get("redirectTo"));
  if (back) redirect(back);
  refresh();
}
