"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { layoutForSize, type RecapData, VIDEO_FORMATS, VIDEO_FPS } from "@wyg/schema";
import { SCENES, STORY_DURATION_IN_FRAMES, WrapStory } from "@wyg/video";
import { SCENE_TITLES } from "@wyg/video/copy";
import { congratsLetter } from "@wyg/video/letter";
import { loopSeconds, TRACK } from "@wyg/video/track";
import Link from "next/link";
import {
  addTransitionType,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  ViewTransition,
} from "react";
import { Art } from "@/components/art";
import { button } from "@/components/ui";
import { LetterSheet } from "./letter-sheet";
import { useMusic } from "./use-music";

const SLIDES = [
  "Intro",
  "Contributions",
  "Rhythm",
  "Languages",
  "Projects",
  "Community",
  "Engineering",
  "Archetype",
  "Summary",
  "Letter",
];
const FORMAT_FOR_LAYOUT = { portrait: "9x16", compact: "4x5", landscape: "16x9" } as const;

/** Frame where each scene starts, from the shared timeline. */
const SCENE_STARTS = SCENES.reduce<number[]>((starts, _scene, i) => {
  starts.push(i === 0 ? 0 : (starts[i - 1] ?? 0) + (SCENES[i - 1]?.durationInFrames ?? 0));
  return starts;
}, []);

type Step =
  | { kind: "welcome" }
  | { kind: "warmup"; index: number }
  | { kind: "scene"; index: number }
  | { kind: "versus" }
  | { kind: "letter" }
  | { kind: "export" };

/** Music plays from the first hello through the last chapter, then fades out (DESIGN.md). */
const musical = (step: Step | undefined) => step?.kind === "warmup" || step?.kind === "scene";

const MUSIC_SRC = `/${TRACK.file}`;
const MUSIC_LOOP = loopSeconds();

/** Small talk before the numbers, like a friend saying hello before the slideshow. */
const WARMUPS = 3;

const STEPS: Step[] = [
  { kind: "welcome" },
  ...Array.from({ length: WARMUPS }, (_, index) => ({ kind: "warmup" as const, index })),
  ...SCENES.map((_, index) => ({ kind: "scene" as const, index })),
  { kind: "versus" },
  { kind: "letter" },
  { kind: "export" },
];

/**
 * The story as a guided walk instead of one long video: each scene plays, stops on its last frame
 * and waits for Next. Then the letter, then the exports. Characters are baked loops (sprite
 * sheets in the Player, animated WebP elsewhere, ADR-0013), so no step needs WebGL.
 * `slideExports` is false where the server can't render chapter slides (server/exports.ts): the
 * export step then offers only the share card and the letter, and says why.
 */
export function StoryFlow({ data, slideExports }: { data: RecapData; slideExports: boolean }) {
  const [step, setStep] = useState(0);
  const [muted, setMuted] = useState(false);
  const [format, setFormat] = useState<keyof typeof VIDEO_FORMATS>("9x16");
  const player = useRef<PlayerRef>(null);
  // The soundtrack runs outside the player, so it plays straight through (looping, no gap) while
  // the player is remounted for each scene. The player itself plays only the sound effects.
  const music = useMusic(MUSIC_SRC, MUSIC_LOOP);
  const current = STEPS[step] ?? STEPS[0];
  const letter = useMemo(() => congratsLetter(data), [data]);
  const year = data.meta.year;

  useEffect(() => {
    const pick = () =>
      setFormat(FORMAT_FOR_LAYOUT[layoutForSize(window.innerWidth, window.innerHeight * 0.7)]);
    pick();
    window.addEventListener("resize", pick);
    return () => window.removeEventListener("resize", pick);
  }, []);

  // The player's in/out frames fence playback to the current scene, so it stops on the scene's
  // last frame and waits for Next. Event-based pausing could overshoot when the tab is throttled.
  const sceneIndex = current?.kind === "scene" ? current.index : 0;
  const inFrame = SCENE_STARTS[sceneIndex] ?? 0;
  const outFrame = inFrame + (SCENES[sceneIndex]?.durationInFrames ?? 1) - 1;

  // Reduced motion (scene-system rule 7, R-39): each chapter opens on its finished last frame and
  // never plays by itself, so the live cast and the cuts stay still. Replay still plays it, on
  // request. Tracked live, so changing the OS setting mid-story applies to the next chapter.
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const replay = useCallback(() => {
    const ref = player.current;
    if (!ref) return;
    ref.seekTo(inFrame);
    ref.play();
  }, [inFrame]);

  useEffect(() => {
    music.setMuted(muted);
    if (muted) player.current?.mute();
    else player.current?.unmute();
  }, [muted, music]);

  /**
   * Moves to a step inside a transition, tagged with its direction, so the step's content slides
   * the right way (<ViewTransition> below). Starts the music when entering a musical step: this
   * runs in the click or key handler, a user gesture, so autoplay rules allow it.
   */
  const stepRef = useRef(step);
  stepRef.current = step;
  const goTo = useCallback(
    (next: number) => {
      const target = Math.min(STEPS.length - 1, Math.max(0, next));
      const from = stepRef.current;
      if (target === from) return;
      if (musical(STEPS[target]) && !music.isPlaying()) music.play();
      startTransition(() => {
        addTransitionType(target > from ? "story-next" : "story-prev");
        setStep(target);
      });
    },
    [music],
  );
  const go = useCallback((delta: number) => goTo(stepRef.current + delta), [goTo]);

  // Past the last chapter (comparison, letter, downloads) the story is over: let the music go.
  useEffect(() => {
    if (!music.isPlaying() || musical(current)) return;
    return music.fadeOut();
  }, [current, music]);

  // The last chapter fades the music out as soon as its animation finishes.
  useEffect(() => {
    const ref = player.current;
    if (!ref || current?.kind !== "scene" || sceneIndex !== SCENES.length - 1) return;
    let cancel: (() => void) | undefined;
    const onEnded = () => {
      if (music.isPlaying()) cancel = music.fadeOut();
    };
    ref.addEventListener("ended", onEnded);
    return () => {
      ref.removeEventListener("ended", onEnded);
      cancel?.();
    };
  }, [current, sceneIndex, music]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA"].includes(event.target.tagName)
      )
        return;
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const { width, height } = VIDEO_FORMATS[format];
  const title =
    current?.kind === "scene"
      ? SCENE_TITLES[SCENES[current.index]?.id ?? "intro"]
      : current?.kind === "warmup"
        ? "Before we start"
        : current?.kind === "versus"
          ? `You vs ${year - 1}`
          : current?.kind === "letter"
            ? "A letter for you"
            : current?.kind === "export"
              ? "Take your year with you"
              : "Welcome";

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* progress */}
      <nav aria-label="Story progress" className="-my-4 flex gap-1.5">
        {STEPS.map((s, i) => (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: the step list is fixed, index is the step
            key={`${s.kind}-${i}`}
            type="button"
            aria-label={`Go to step ${i + 1} of ${STEPS.length}`}
            aria-current={i === step ? "step" : undefined}
            onClick={() => goTo(i)}
            // A 44px tall hit area (R-03 touch target) around a thin visible bar.
            className="group flex h-11 min-w-0 flex-1 items-center"
          >
            <span
              className={`h-2 w-full rounded-full motion-safe:transition-colors ${i <= step ? "bg-[#26a641]" : "bg-line group-hover:bg-muted"}`}
            />
          </button>
        ))}
      </nav>

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold sm:text-4xl" aria-live="polite">
          {title}
        </h1>
        <div className="flex gap-2">
          {current?.kind === "scene" && (
            <button
              type="button"
              aria-label="Replay this chapter"
              className={iconButton}
              onClick={replay}
            >
              <ReplayIcon />
            </button>
          )}
          {step > 0 && (
            <button
              type="button"
              aria-label={muted ? "Turn sound on" : "Turn sound off"}
              aria-pressed={!muted}
              className={iconButton}
              onClick={() => setMuted((m) => !m)}
            >
              <SoundIcon muted={muted} />
            </button>
          )}
        </div>
      </div>

      <ViewTransition
        key={step}
        enter={{ "story-next": "story-next", "story-prev": "story-prev", default: "none" }}
        exit={{ "story-next": "story-next", "story-prev": "story-prev", default: "none" }}
        default="none"
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          {current?.kind === "welcome" && (
            <div className="grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
              <ComicArt
                art="hero-cast"
                alt="Cell, the WrapYourGit mascot, waving in front of snapshots of a workshop, fireworks and mountains"
                priority
              />
              <div className="flex flex-col items-start gap-5">
                <p className="text-2xl font-bold">@{data.profile.login}</p>
                <p className="text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-6xl">
                  Ready for your {year}?
                </p>
                <p className="max-w-md text-lg">
                  A little hello, then nine short chapters about the year you had. Each one waits
                  for you, so take your time. Music plays along; the speaker at the top right turns
                  it off.
                </p>
                <button type="button" className={button.primary} onClick={() => go(1)}>
                  Start my story
                </button>
              </div>
            </div>
          )}

          {/* The player stays mounted during scenes so seeking is instant between chapters. */}
          <div
            className={
              current?.kind === "scene" ? "flex w-full flex-col items-center gap-4" : "hidden"
            }
          >
            <div className="w-full max-w-5xl">
              <Player
                ref={player}
                // One mount per scene: starts at the scene's first frame and plays inside its fence,
                // or, with reduced motion, opens on the finished last frame and waits.
                key={`${sceneIndex}-${reduceMotion}`}
                initialFrame={reduceMotion ? outFrame : inFrame}
                autoPlay={!reduceMotion && current?.kind === "scene"}
                initiallyMuted={muted}
                // Stay on the last frame when the scene ends; jumping back showed an empty wipe frame.
                moveToBeginningWhenEnded={false}
                component={WrapStory}
                inputProps={{ data, music: false }}
                durationInFrames={STORY_DURATION_IN_FRAMES}
                fps={VIDEO_FPS}
                compositionWidth={width}
                compositionHeight={height}
                acknowledgeRemotionLicense
                inFrame={inFrame}
                outFrame={outFrame}
                clickToPlay={false}
                style={{ width: "100%", maxHeight: "62svh", aspectRatio: `${width} / ${height}` }}
              />
            </div>
          </div>

          {current?.kind === "warmup" && (
            <Warmup key={current.index} index={current.index} data={data} />
          )}

          {current?.kind === "versus" && <Versus data={data} />}

          {current?.kind === "letter" && (
            <div className="w-full max-w-3xl pt-4">
              <LetterSheet data={data} letter={letter} />
            </div>
          )}

          {current?.kind === "export" && (
            <div className="flex w-full max-w-5xl flex-col gap-8">
              <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.2fr]">
                <ComicArt art="cutout-cell-cheer" alt="Cell cheering, your files are ready" />
                <div className="flex flex-col items-start gap-4">
                  <p className="text-lg">
                    Your story as files you can keep and post. Private repositories are never named.
                  </p>
                  {slideExports ? (
                    <div className="flex flex-wrap gap-3">
                      <a href="/api/story/pdf" download className={button.primary}>
                        Download PDF
                      </a>
                      <a href="/api/story/zip" download className={button.secondary}>
                        All slides (PNG, ZIP)
                      </a>
                      <a href="/api/card" download className={button.quiet}>
                        Share card (PNG)
                      </a>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-3">
                        <a href="/api/card" download className={button.primary}>
                          Share card (PNG)
                        </a>
                        <a
                          href={`/api/story/slide/${SLIDES.length}?download`}
                          download
                          className={button.secondary}
                        >
                          Letter (PNG)
                        </a>
                      </div>
                      <p className="text-base">
                        The PDF and the chapter slides aren't available on this site yet: drawing
                        them needs a render server that isn't set up here. The share card and your
                        letter work now.
                      </p>
                    </>
                  )}
                  <button
                    type="button"
                    disabled
                    aria-describedby="mp4-note"
                    className={button.quiet}
                  >
                    Video (MP4)
                  </button>
                  <p id="mp4-note" className="text-base">
                    Coming soon: video export is being set up.
                  </p>
                </div>
              </div>
              {slideExports && (
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  {SLIDES.map((name, i) => (
                    <li key={name} className="flex flex-col gap-2">
                      {/* biome-ignore lint/performance/noImgElement: cookie-authenticated API image; the next/image optimizer would fetch it without the session */}
                      <img
                        src={`/api/story/slide/${i + 1}`}
                        alt={`Slide ${i + 1}: ${name}`}
                        width={1080}
                        height={1350}
                        loading="lazy"
                        className="h-auto w-full rounded-lg border border-line bg-surface"
                      />
                      <a
                        href={`/api/story/slide/${i + 1}?download`}
                        download
                        className="font-bold underline underline-offset-4"
                      >
                        Download {name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </ViewTransition>

      <div className="flex items-center justify-between gap-4">
        <button type="button" className={button.quiet} onClick={() => go(-1)} disabled={step === 0}>
          Back
        </button>
        {step < STEPS.length - 1 ? (
          step > 0 && (
            <button type="button" className={button.primary} onClick={() => go(1)}>
              Next
            </button>
          )
        ) : (
          <Link href="/dashboard" className={button.primary}>
            Back to dashboard
          </Link>
        )}
      </div>
    </div>
  );
}

const iconButton =
  "inline-flex size-11 items-center justify-center rounded-[var(--radius-control)] border border-line bg-overlay text-fg hover:border-muted hover:bg-line active:bg-[#282e33] motion-safe:transition-colors";

function ReplayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      {muted ? (
        <path d="M17 9l5 6M22 9l-5 6" />
      ) : (
        <>
          <path d="M16.5 8.5a5 5 0 0 1 0 7" />
          <path d="M19.5 5.5a9 9 0 0 1 0 13" />
        </>
      )}
    </svg>
  );
}

/** A baked 3D illustration rising into place. */
function ComicArt({
  art,
  alt,
  priority = false,
}: {
  art: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    // The art is scaled up for presence; clip the sides (transparent margin) so it never widens
    // the page on a phone. `clip`, not `hidden`, so it can still grow upwards.
    <div className="mx-auto w-full max-w-xl overflow-x-clip lg:max-w-none">
      <Art
        id={art}
        alt={alt}
        priority={priority}
        className="h-auto w-full origin-bottom scale-[1.3] motion-safe:animate-[rise_700ms_ease-out_both]"
      />
    </div>
  );
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * The warm-up: three short hellos before the chapters. Friendly, but still about this person's
 * real year (their first contribution, their private work), never invented.
 */
function Warmup({ index, data }: { index: number; data: RecapData }) {
  const { profile, contributions, meta } = data;
  const first = contributions.calendar.find((day) => day.count > 0);
  const firstDate = first ? new Date(`${first.date}T00:00:00Z`) : null;
  const hidden = contributions.privateCount.status === "ok" ? contributions.privateCount.value : 0;
  const slides = [
    {
      art: "cutout-cell-wave",
      title: `Hey ${profile.name?.split(" ")[0] ?? `@${profile.login}`}!`,
      body: `Cell here. I spent a little while reading through your ${meta.year}, and I have a few things to show you. First, a quick hello.`,
    },
    firstDate
      ? {
          art: "cutout-cell-think",
          title: `It started on ${MONTHS[firstDate.getUTCMonth()]} ${firstDate.getUTCDate()}.`,
          body: `Your first contribution of ${meta.year} landed on a ${WEEKDAYS[firstDate.getUTCDay()]}. Everything that follows grew from that one square.`,
        }
      : {
          art: "cutout-cell-think",
          title: "Every year starts with a blank graph.",
          body: "Yours is still waiting for its first square, and that is a fine place to begin.",
        },
    hidden > 0
      ? {
          art: "cutout-cell-proud",
          title: "Some of it stayed private.",
          body: `${hidden.toLocaleString("en-US")} contributions went to private repositories, yours and your organisations'. Every one is counted, and their names stay with you.`,
        }
      : {
          art: "cutout-cell-proud",
          title: "Let's see what you made.",
          body: "Nine chapters, about a minute of music. Each one waits for you, so take your time.",
        },
  ];
  const slide = slides[index] ?? slides[0];
  if (!slide) return null;
  return (
    <div className="grid w-full max-w-5xl items-center gap-6 lg:grid-cols-[1fr_1.1fr]">
      <ComicArt art={slide.art} alt="" />
      <div className="motion-safe:animate-[rise_700ms_200ms_ease-out_both]">
        <p className="text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-6xl">
          {slide.title}
        </p>
        <p className="mt-6 max-w-md text-xl">{slide.body}</p>
      </div>
    </div>
  );
}

/** This year against the same span of last year, as three big boxes. */
function Versus({ data }: { data: RecapData }) {
  const { previousYear, contributions, meta } = data;
  if (previousYear.status !== "ok") {
    return (
      <div className="grid w-full max-w-5xl items-center gap-6 lg:grid-cols-[1fr_1.1fr]">
        <ComicArt art="cutout-cell-think" alt="" />
        <p className="text-2xl font-bold">
          Last year couldn't be read from GitHub this time, so there's nothing to compare yet. Sync
          again later from your dashboard.
        </p>
      </div>
    );
  }
  const last = previousYear.value;
  const rows = [
    { label: "contributions", now: contributions.total, before: last.sameSpan.contributions },
    { label: "active days", now: contributions.activeDays, before: last.sameSpan.activeDays },
    {
      label: "days in your longest streak",
      now: contributions.longestStreak.days,
      before: last.sameSpan.longestStreak,
    },
  ];
  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <p className="text-xl">
        {meta.isFinal
          ? `${meta.year} against all of ${last.year}.`
          : `${meta.year} so far against the same stretch of ${last.year}, up to ${last.sameSpan.through}.`}
      </p>
      <ul className="grid gap-5 md:grid-cols-3">
        {rows.map((row, i) => {
          const diff = row.now - row.before;
          return (
            <li
              key={row.label}
              className="rounded-xl border border-line bg-surface p-6 motion-safe:animate-[rise_600ms_ease-out_both]"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <p className="text-6xl font-bold tabular-nums">{row.now.toLocaleString("en-US")}</p>
              <p className="text-lg text-muted">{row.label}</p>
              <p className="mt-4 text-base">
                {row.before.toLocaleString("en-US")} in {last.year}
              </p>
              <p className="mt-1 text-xl font-extrabold">
                {diff === 0
                  ? "Right on par"
                  : `${diff > 0 ? "+" : "−"}${Math.abs(diff).toLocaleString("en-US")} ${diff > 0 ? "up" : "down"}`}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="text-lg">
        All of {last.year}: {last.fullYear.contributions.toLocaleString("en-US")} contributions.
      </p>
    </div>
  );
}
