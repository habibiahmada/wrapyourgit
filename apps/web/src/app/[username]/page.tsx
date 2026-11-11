import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isReserved, recapPath } from "@/server/routes";
import { LoadingScreen } from "./loading-screen";
import { RecapRoute, recapMetadata } from "./recap-route";

/**
 * Seconds: up to 60 s waiting for another request's fetch of the same account (public-recaps.ts
 * WAIT_MS), then possibly a fetch of its own (about 20 s), with room to spare.
 */
export const maxDuration = 120;

export async function generateMetadata({ params }: PageProps<"/[username]">): Promise<Metadata> {
  const { username } = await params;
  return recapMetadata(username);
}

/**
 * Every GitHub username's recap: the owner's full recap for the signed-in owner, the public recap
 * for everyone else. Static routes (/settings, /privacy, ...) win over this one; a different case
 * of them (/Settings) lands here and goes to the /u/ fallback.
 */
export default function UsernamePage({ params }: PageProps<"/[username]">) {
  // Any name may arrive, so the prerendered shell can't know it: the unnamed loading screen is
  // swapped for the named one as soon as the request's name is read.
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Username params={params} />
    </Suspense>
  );
}

async function Username({ params }: Pick<PageProps<"/[username]">, "params">) {
  const { username } = await params;
  if (isReserved(username)) redirect(recapPath(username));
  return <RecapRoute name={username} />;
}
