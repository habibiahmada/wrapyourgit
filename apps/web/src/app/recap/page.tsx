import { EDITION_YEAR } from "@wyg/schema";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadingCell } from "@/components/loading-cell";
import { button } from "@/components/ui";
import { getCurrentUser } from "@/server/auth";
import { getRecap } from "@/server/recaps";
import { StoryFlow } from "./story-flow";

export default function RecapPage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-10">
      <div className="flex w-full max-w-5xl items-center justify-between gap-4">
        <p className="text-lg font-extrabold">WrapYourGit · {EDITION_YEAR}</p>
        <Link href="/dashboard" className="font-bold underline underline-offset-4">
          Back to dashboard
        </Link>
      </div>
      <Suspense fallback={<LoadingCell label="Loading your story…" />}>
        <Story />
      </Suspense>
    </main>
  );
}

async function Story() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const recap = await getRecap(user.id);
  if (!recap) {
    return (
      <div className="flex flex-col items-start gap-4 py-16">
        <h1 className="text-4xl font-extrabold">No story yet.</h1>
        <p className="text-lg">Build your recap on the dashboard first.</p>
        <Link href="/dashboard" className={button.primary}>
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
