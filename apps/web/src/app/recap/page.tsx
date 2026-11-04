import { EDITION_YEAR } from "@wyg/schema";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadingCell } from "@/components/loading-cell";
import {
  FallbackTransition,
  PageTransition,
  RevealTransition,
} from "@/components/site/page-transition";
import { button } from "@/components/ui";
import { getCurrentUser } from "@/server/auth";
import { getRecap } from "@/server/recaps";
import { StoryFlow } from "./story-flow";

export default function RecapPage() {
  return (
    <>
      <header
        className="sticky top-0 z-40 border-b border-line bg-[#010409]"
        style={{ viewTransitionName: "site-header" }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
          <p className="flex items-center gap-2 text-lg font-bold">
            WrapYourGit
            <span className="rounded-full border border-line px-2 text-xs font-semibold text-muted tabular-nums">
              {EDITION_YEAR}
            </span>
          </p>
          <Link href="/dashboard" transitionTypes={["nav-back"]} className={button.quiet}>
            Back to dashboard
          </Link>
        </div>
      </header>
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
