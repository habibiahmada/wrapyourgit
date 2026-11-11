"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { setPublicRecapHidden } from "@/server/public-recaps";

/** The "Hide my public recap" switch. Re-checks the session itself. */
export async function setPublicRecapHiddenAction(form: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const hide = form.get("hide");
  // Only the switch's two values count; anything else changes nothing.
  if (hide !== "yes" && hide !== "no") return;
  await setPublicRecapHidden(user.githubId, hide === "yes");
  redirect("/settings");
}
