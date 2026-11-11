"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { forgetPublicRecap, setHidden } from "@/server/public-recaps";

/** The "Hide my public recap" switch. Re-checks the session itself. */
export async function setPublicRecapHiddenAction(form: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const hide = form.get("hide");
  // Only the switch's two values count; anything else changes nothing.
  if (hide !== "yes" && hide !== "no") return;
  await setHidden(user.githubId, hide === "yes");
  // Hiding also drops the stored copy, so nothing of it is left to serve if the switch goes off.
  if (hide === "yes") await forgetPublicRecap(user.githubId);
  redirect("/settings");
}
