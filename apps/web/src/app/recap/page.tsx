import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadingCell } from "@/components/loading-cell";
import { PageTransition } from "@/components/site/page-transition";
import { SiteHeader } from "@/components/site/site-header";
import { button } from "@/components/ui";
import { getCurrentUser } from "@/server/auth";
import { getPrivateNamesChoice, hasPrivateNames, storyData } from "@/server/privacy";
import { getRecap } from "@/server/recaps";
import { PrivateNamesQuestion } from "./private-names-question";
import { WorldPlayer } from "./world-player";

/** Signed-in only: nothing here for search engines. */
export const metadata: Metadata = { title: "Your story", robots: { index: false, follow: false } };

/**
 * The story world, full screen and without the site header. Before it first plays, the owner
 * answers whether private repository names show; that answer decides the story and its files.
 */
export default function RecapPage() {
  return (
    <Suspense
      fallback={
        <main id="main" className="flex flex-1 flex-col">
          <LoadingCell label="Loading your story…" />
        </main>
      }
    >
      <Story />
    </Suspense>
  );
}

async function Story() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const recap = await getRecap(user.id);
  if (!recap) return <NoStory />;
  const choice = await getPrivateNamesChoice(user.id);
  if (choice === null) return <PrivateNamesQuestion />;
  return (
    <main id="main" className="flex-1 bg-paper text-ink">
      <h1 className="sr-only">Your year as a city</h1>
      <WorldPlayer
        data={storyData(recap.data, choice)}
        privateNames={choice && hasPrivateNames(recap.data)}
      />
    </main>
  );
}

function NoStory() {
  return (
    <>
      <SiteHeader variant="app" current="recap" />
      <PageTransition>
        <main id="main" className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-10">
          <div className="flex flex-col items-start gap-4 py-16">
            <h1 className="text-4xl font-bold">No story yet.</h1>
            <p className="text-lg text-muted">Build your recap on the dashboard first.</p>
            <Link href="/dashboard" transitionTypes={["nav-back"]} className={button.primary}>
              Build my recap
            </Link>
          </div>
        </main>
      </PageTransition>
    </>
  );
}
