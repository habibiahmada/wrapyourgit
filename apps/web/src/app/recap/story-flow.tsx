"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { layoutForSize, type RecapData, VIDEO_FORMATS, VIDEO_FPS } from "@wyg/schema";
import { SCENES, STORY_DURATION_IN_FRAMES, WrapStory } from "@wyg/video";
import { SCENE_TITLES } from "@wyg/video/copy";
import { congratsLetter } from "@wyg/video/letter";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { button } from "@/components/ui";

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
 * and waits for Next. Then the letter, then the exports. One WebGL canvas at a time: 3D appears
 * only on the welcome, archetype, letter and export steps, and unmounts when the step changes.
 */
export function StoryFlow({ data }: { data: RecapData }) {
  const [step, setStep] = useState(0);
  const [muted, setMuted] = useState(false);
  const [format, setFormat] = useState<keyof typeof VIDEO_FORMATS>("9x16");
  const player = useRef<PlayerRef>(null);
  // The soundtrack runs on its own element, so it plays straight through while the player is
  // remounted for each scene (the player itself is always muted).
  const music = useRef<HTMLAudioElement>(null);
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

  const replay = useCallback(() => {
    const ref = player.current;
    if (!ref) return;
    ref.seekTo(inFrame);
    ref.play();
  }, [inFrame]);

  useEffect(() => {
    if (music.current) music.current.muted = muted;
  }, [muted]);

  /** Starts the music on the first move past the welcome (a user gesture, so autoplay allows it). */
  const goTo = useCallback((next: number) => {
    const target = Math.min(STEPS.length - 1, Math.max(0, next));
    if (target > 0 && music.current?.paused) void music.current.play().catch(() => {});
    setStep(target);
  }, []);
  const go = useCallback((delta: number) => goTo(step + delta), [goTo, step]);

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

      {/* biome-ignore lint/a11y/useMediaCaption: instrumental music with no speech to caption */}
      <audio ref={music} src="/audio/wrapyourgit-120bpm.m4a" loop preload="auto" />

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

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        {current?.kind === "welcome" && (
          <div className="grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
            <ComicArt
              art="hero-cast"
              alt="Cell the builder waving in front of a 3D contribution graph, with a beaver, an owl and a bee"
              priority
            />
            <div className="flex flex-col items-start gap-5">
              <p className="text-2xl font-bold">@{data.profile.login}</p>
              <p className="text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-6xl">
                Ready for your {year}?
              </p>
              <p className="max-w-md text-lg">
                A little hello, then nine short chapters about the year you had. Each one waits for
                you, so take your time. Music plays along; the speaker at the top right turns it
                off.
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
              // One mount per scene: starts at the scene's first frame and plays inside its fence.
              key={sceneIndex}
              initialFrame={inFrame}
              autoPlay={current?.kind === "scene"}
              initiallyMuted
              // Stay on the last frame when the scene ends; jumping back showed an empty wipe frame.
              moveToBeginningWhenEnded={false}
              component={WrapStory}
              inputProps={{ data }}
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
          <div className="relative w-full max-w-3xl pt-4 sm:pl-24">
            {/* Cell peeks in from the left edge of the letter, waving. */}
            <Image
              src="/art/cutout-cell-wave.png"
              alt=""
              width={1200}
              height={900}
              className="pointer-events-none absolute top-24 -left-6 hidden w-40 -rotate-12 sm:block motion-safe:animate-[bob_2.4s_ease-in-out_infinite]"
            />
            <article className="on-light relative rounded-xl bg-paper px-6 py-10 text-ink sm:px-12 sm:py-14">
              {/* A stamp in the corner, the way a real letter arrives. */}
              <div className="absolute top-5 right-5 w-24 rotate-3 rounded-sm border-4 border-dashed border-persimmon bg-paper p-1 sm:w-28">
                <Image
                  src="/art/cutout-cell-proud.png"
                  alt=""
                  width={1200}
                  height={900}
                  className="h-auto w-full bg-persimmon/15"
                />
                <p className="text-center text-xs font-bold">{year}</p>
              </div>
              <p className="pr-28 text-base font-bold text-ink-soft">From Cell, at WrapYourGit</p>
              <p className="mt-6 text-3xl font-extrabold sm:text-4xl">{letter.greeting}</p>
              <div className="mt-6 flex max-w-[62ch] flex-col gap-5">
                {letter.paragraphs.map((paragraph, i) => (
                  <p
                    key={paragraph}
                    className={`leading-[1.7] motion-safe:animate-[rise_700ms_ease-out_both] ${i === 0 ? "text-xl" : "text-lg"}`}
                    style={{ animationDelay: `${200 + i * 260}ms` }}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
              <div className="mt-10 flex items-end justify-between gap-4 border-t-2 border-ink/15 pt-6">
                <div>
                  <p className="text-lg">With pride,</p>
                  <p className="text-3xl font-extrabold">Cell</p>
                  <p className="text-base text-ink-soft">your WrapYourGit guide</p>
                </div>
                <p className="text-base text-ink-soft">{data.meta.periodEnd}</p>
              </div>
            </article>
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
                <button type="button" disabled aria-describedby="mp4-note" className={button.quiet}>
                  Video (MP4)
                </button>
                <p id="mp4-note" className="text-base">
                  Coming soon: video export is being set up.
                </p>
              </div>
            </div>
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
          </div>
        )}
      </div>

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
    <div className="mx-auto w-full max-w-xl lg:max-w-none">
      <Image
        src={`/art/${art}.png`}
        alt={alt}
        width={1200}
        height={900}
        preload={priority}
        sizes="(min-width: 1024px) 45vw, 90vw"
        className="h-auto w-full motion-safe:animate-[rise_700ms_ease-out_both]"
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

const FIELDS = ["rounded-xl border border-line bg-surface"] as const;

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
    <div
      className={`grid w-full max-w-5xl items-center gap-6 overflow-hidden rounded-[6px] p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr] ${FIELDS[index % FIELDS.length]}`}
    >
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
