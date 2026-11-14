"use client";

import type { RecapData } from "@wyg/schema";
import { useEffect, useRef, useState } from "react";
import { Art } from "@/components/art";
import { button } from "@/components/ui";
import { WorldPlayer } from "../recap/world-player";

/**
 * A visitor's story: it plays as soon as the page has the data, with no card to click first.
 * `data` is the public recap (loadPublicRecap); the player projects it again (`publicWorld`).
 * Leaving the story lands on a short page to play it again or make your own.
 */
export function VisitorStory({ data, signedIn }: { data: RecapData; signedIn: boolean }) {
  const [playing, setPlaying] = useState(true);
  const again = useRef<HTMLButtonElement>(null);
  const { login } = data.profile;
  const { year, isFinal } = data.meta;

  // The player held focus; it unmounts on exit, so focus moves to Play again, not <body>.
  useEffect(() => {
    if (!playing) again.current?.focus();
  }, [playing]);

  if (playing) {
    return (
      <main id="main" className="flex-1 bg-paper text-ink">
        <WorldPlayer
          variant="public"
          title={`@${login}'s year as a city`}
          data={data}
          signedIn={signedIn}
          onExit={() => setPlaying(false)}
        />
      </main>
    );
  }

  return (
    <main id="main" className="flex flex-1 flex-col">
      <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-8 px-4 py-16 sm:px-8 lg:grid-cols-[1fr_minmax(0,26rem)]">
        <div className="flex min-w-0 flex-col items-start">
          <p className="text-lg font-bold wrap-anywhere">
            @{login} · {isFinal ? year : `${year} so far`}
          </p>
          <h1 className="mt-2 text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-7xl">
            That was their year.
          </h1>
          <p className="mt-6 text-lg text-muted">Public GitHub activity only.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              ref={again}
              type="button"
              onClick={() => setPlaying(true)}
              className={`${button.primary} max-w-full wrap-anywhere`}
            >
              Play @{login}'s year again
            </button>
            {signedIn ? (
              <a href="/dashboard" className={button.secondary}>
                Go to dashboard
              </a>
            ) : (
              <a href="/" className={button.secondary}>
                Make your own recap
              </a>
            )}
          </div>
        </div>
        {/* Cell's head (HEAD_ART_ID in packages/video art.ts): the face the story opens on. */}
        <Art
          id="head-cell"
          alt=""
          width={600}
          height={600}
          className="order-first mx-auto h-auto w-48 sm:w-64 lg:order-none lg:w-full"
        />
      </div>
    </main>
  );
}
