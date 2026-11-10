"use client";

import type { RecapData } from "@wyg/schema";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Art } from "@/components/art";
import { button } from "@/components/ui";
import { WorldPlayer } from "../../recap/world-player";

/*
 * The card and the player share the page (client state, no route), so the card's metadata stays
 * the page's metadata. While the story plays, the rest of the page (site header, sections, footer)
 * is hidden, not just covered: covered content would stay in the tab order and the reading order.
 */
const Playing = createContext<{ playing: boolean; setPlaying: (playing: boolean) => void }>({
  playing: false,
  setPlaying: () => {},
});

export function PublicPlayback({ children }: { children: ReactNode }) {
  const [playing, setPlaying] = useState(false);
  return <Playing value={{ playing, setPlaying }}>{children}</Playing>;
}

/** Page content outside the card: in the layout as if unwrapped, gone while the story plays. */
export function HiddenWhilePlaying({ children }: { children: ReactNode }) {
  const { playing } = useContext(Playing);
  return <div className={playing ? "hidden" : "contents"}>{children}</div>;
}

/**
 * A shared recap's opening card, and the story world it plays. `data` is already the public
 * projection; the player projects it again (`publicWorld`), so this file decides nothing about
 * what a visitor sees.
 */
export function PublicStory({ data }: { data: RecapData }) {
  const { playing, setPlaying } = useContext(Playing);
  const [played, setPlayed] = useState(false);
  const play = useRef<HTMLButtonElement>(null);
  const { login } = data.profile;
  const { year, isFinal } = data.meta;

  const exit = useCallback(() => {
    setPlaying(false);
    setPlayed(true);
  }, [setPlaying]);

  // Back on the card after the story: focus returns to where the reader left from.
  useEffect(() => {
    if (!playing && played) play.current?.focus();
  }, [playing, played]);

  return (
    <>
      {playing && (
        <WorldPlayer
          variant="public"
          title={`@${login}'s year as a city`}
          data={data}
          onExit={exit}
        />
      )}
      <section aria-labelledby="recap-title" hidden={playing} className="border-b border-line">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pt-12 pb-16 sm:px-8 sm:pt-16 lg:grid-cols-[1fr_minmax(0,26rem)]">
          <div className="flex flex-col items-start">
            <p className="text-lg font-bold">
              @{login} · {isFinal ? year : `${year} so far`}
            </p>
            <h1
              id="recap-title"
              className="mt-2 text-7xl leading-[0.9] font-extrabold tracking-tight tabular-nums sm:text-[10rem]"
            >
              {data.contributions.total.toLocaleString("en-US")}
              <span className="block text-3xl tracking-normal text-green sm:text-4xl">
                contributions
              </span>
            </h1>
            <p className="mt-8 text-base text-muted">Private repository names are not shown.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                ref={play}
                type="button"
                onClick={() => setPlaying(true)}
                className={button.primary}
              >
                Play @{login}'s year
              </button>
              {played && (
                <a href="/" className={button.secondary}>
                  Make your own
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
            priority
            className="order-first mx-auto h-auto w-48 sm:w-64 lg:order-none lg:w-full"
          />
        </div>
      </section>
    </>
  );
}
