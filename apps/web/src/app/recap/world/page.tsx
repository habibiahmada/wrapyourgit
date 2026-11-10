import { toPublicRecap } from "@wyg/analytics";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/server/auth";
import { getRecap } from "@/server/recaps";
import { SampleWorldPlayer, WorldPlayer } from "./world-player";

export const metadata: Metadata = {
  title: "Story world",
  robots: { index: false, follow: false },
};

/**
 * The story world, full screen and without the site header. Development only until phase 4: in
 * production the route is a 404 before it reads anything.
 */
export default function WorldPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main id="main" className="flex-1 bg-paper text-ink">
      <h1 className="sr-only">Your year as a city</h1>
      <Suspense fallback={<p className="p-6 text-lg font-semibold">Loading your story…</p>}>
        <World />
      </Suspense>
    </main>
  );
}

async function World() {
  const user = await getCurrentUser();
  const recap = user ? await getRecap(user.id) : null;
  // Development only: without a signed-in user or a recap, the sample keeps the page usable.
  if (!recap) return <SampleWorldPlayer />;
  // Every file the end screen makes leaves the site, so it gets the public projection (rule 6).
  return <WorldPlayer data={recap.data} exportData={toPublicRecap(recap.data)} />;
}
