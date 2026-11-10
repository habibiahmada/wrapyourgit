"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/server/auth";
import { setPrivateNamesChoice } from "@/server/privacy";

/** Saves the answer to "Show your private repository names?". Re-checks the session itself. */
export async function setPrivateNamesAction(form: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const show = form.get("show");
  // Only the two buttons' values count; anything else leaves the question unanswered.
  if (show !== "yes" && show !== "no") return;
  await setPrivateNamesChoice(user.id, show === "yes");
  refresh();
}
