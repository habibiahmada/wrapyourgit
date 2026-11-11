import { EDITION_YEAR } from "@wyg/schema";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { type CurrentUser, getCurrentUser, ReauthorizeError } from "@/server/auth";
import { errorSummary } from "@/server/log";
import { getPrivateNamesChoice, showFilesReminder, storyData } from "@/server/privacy";
import { isFresh } from "@/server/public-policy";
import { clientKey, loadPublicRecap } from "@/server/public-recaps";
import { getRecap, type StoredRecap, SyncTooSoonError, syncRecap } from "@/server/recaps";
import { recapPath, viewerKind } from "@/server/routes";
import { OPEN_GRAPH } from "@/site";
import { PrivateNamesQuestion } from "../recap/private-names-question";
import { WorldPlayer } from "../recap/world-player";
import { LoadingScreen } from "./loading-screen";
import {
  BusyPage,
  ErrorPage,
  HiddenPage,
  LimitedPage,
  MissingPage,
  OrganizationPage,
  OwnerErrorPage,
} from "./result-pages";
import { VisitorStory } from "./visitor-story";

/*
 * The recap at /<username> (and at /u/<name> for a name a site route already uses). Shared by
 * both pages; each decides which names it serves before rendering this.
 */

/** Built from the name alone: the data may take a fetch, and the page streams it separately. */
export function recapMetadata(name: string): Metadata {
  const title = `@${name}'s ${EDITION_YEAR} on GitHub`;
  const description = `@${name}'s ${EDITION_YEAR} on GitHub as a story, from their public activity.`;
  return {
    title,
    description,
    alternates: { canonical: recapPath(name) },
    // Any name resolves to a page, and a crawler visit can cost a GitHub fetch: shareable, but
    // not something to index.
    robots: { index: false, follow: true },
    openGraph: { ...OPEN_GRAPH, type: "profile", url: recapPath(name), title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** The loading screen streams at once; the recap replaces it when it is ready. */
export function RecapRoute({ name }: { name: string }) {
  return (
    <Suspense fallback={<LoadingScreen login={name} />}>
      <Recap name={name} />
    </Suspense>
  );
}

async function Recap({ name }: { name: string }) {
  const user = await getCurrentUser();
  if (user && viewerKind(user.login, name) === "owner")
    return <OwnerRecap user={user} name={name} />;
  return <VisitorRecap name={name} />;
}

/**
 * The owner's full recap, the same as /recap used to show: the private-names question first, then
 * the owner player. A missing or stale recap syncs here, behind the loading screen.
 */
async function OwnerRecap({ user, name }: { user: CurrentUser; name: string }) {
  if (user.login !== name) redirect(recapPath(user.login));
  const recap = await freshRecap(user.id);
  if (recap === "reauthorize") redirect("/api/auth/signin");
  if (recap === "failed" || recap === "building") {
    return <OwnerErrorPage login={user.login} building={recap === "building"} />;
  }
  const choice = await getPrivateNamesChoice(user.id);
  if (choice === null) return <PrivateNamesQuestion />;
  return (
    <main id="main" className="flex-1 bg-paper text-ink">
      <WorldPlayer
        variant="owner"
        title="Your year as a city"
        data={storyData(recap.data, choice)}
        privateNames={showFilesReminder(choice, recap.data)}
      />
    </main>
  );
}

/**
 * The stored recap when it is fresh (the public 12-hour rule, ruling R3), otherwise a new sync. A
 * sync refused by the cooldown or failing serves the stored recap when there is one. The browser's
 * timezone isn't known on a server render, so the sync keeps the one the recap was built with
 * (the dashboard's sync sends the browser's), or UTC for a first recap.
 */
async function freshRecap(
  userId: string,
): Promise<StoredRecap | "reauthorize" | "failed" | "building"> {
  const stored = await getRecap(userId);
  if (stored && isFresh(stored.syncedAt, new Date())) return stored;
  try {
    return await syncRecap(userId, stored?.data.meta.timezone ?? "UTC");
  } catch (error) {
    if (error instanceof ReauthorizeError) return "reauthorize";
    if (error instanceof SyncTooSoonError) return stored ?? "building";
    console.error("Auto-sync failed", errorSummary(error));
    return stored ?? "failed";
  }
}

/** Anyone else: the public recap, fetched as an outsider sees it (never the owner's own). */
async function VisitorRecap({ name }: { name: string }) {
  const result = await loadPublicRecap(name, clientKey(await headers()));
  switch (result.kind) {
    case "recap":
      // Only a played recap moves to GitHub's casing: the next request is then a stored read,
      // while the other outcomes would ask GitHub again.
      if (result.login !== name) redirect(recapPath(result.login));
      return <VisitorStory data={result.data} />;
    case "missing":
      return <MissingPage login={result.login} />;
    case "organization":
      return <OrganizationPage login={result.login} />;
    case "hidden":
      return <HiddenPage login={result.login} />;
    case "busy":
      return <BusyPage login={result.login} />;
    case "limited":
      return <LimitedPage login={result.login} />;
    case "error":
      return <ErrorPage login={result.login} />;
  }
}
