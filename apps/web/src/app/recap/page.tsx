import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadingCell } from "@/components/loading-cell";
import {
  FallbackTransition,
  PageTransition,
  RevealTransition,
} from "@/components/site/page-transition";
import { SiteHeader } from "@/components/site/site-header";
import { button } from "@/components/ui";
import { getCurrentUser } from "@/server/auth";
import { getRecap } from "@/server/recaps";
import { StoryFlow } from "./story-flow";

/** Signed-in only: nothing here for search engines. */
export const metadata: Metadata = { title: "Your story", robots: { index: false, follow: false } };

export default function RecapPage() {
  return (
    <>
      <SiteHeader variant="app" current="recap" />
      <PageTransition>
        <main id="main" className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-10">
          <Suspense
            fallback={
              <FallbackTransition>
                <LoadingCell label="Loading your story…" />
              </FallbackTransition>
            }
          >
            <RevealTransition>
              <Story />
            </RevealTransition>
          </Suspense>
        </main>
      </PageTransition>
    </>
  );
}

async function Story() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const recap = await getRecap(user.id);
  if (!recap) {
    return (
      <div className="flex flex-col items-start gap-4 py-16">
        <h1 className="text-4xl font-bold">No story yet.</h1>
        <p className="text-lg text-muted">Build your recap on the dashboard first.</p>
        <Link href="/dashboard" transitionTypes={["nav-back"]} className={button.primary}>
          Build my recap
        </Link>
      </div>
    );
  }
  return (
    <div className="flex w-full max-w-6xl flex-1 flex-col">
      <StoryFlow data={recap.data} />
    </div>
  );
}
