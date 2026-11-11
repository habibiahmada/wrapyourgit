import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RideGate } from "./ride-gate";

export const metadata: Metadata = {
  title: "Story ride: render gate",
  robots: { index: false, follow: false },
};

/**
 * Development only: plays the story ride and measures how long the browser takes to render it,
 * beside today's story (phase 1 gate of docs/superpowers/plans/2026-11-11-story-ride-1-engine.md).
 * It is linked from nowhere and does not exist in a production build.
 */
export default function RideGatePage() {
  if (process.env.NODE_ENV !== "development") notFound();
  // The gate reads the clock and the calendar while it renders, so it streams in after the shell.
  return (
    <Suspense fallback={<p className="px-4 py-8 text-muted">Loading the gate.</p>}>
      <RideGate />
    </Suspense>
  );
}
