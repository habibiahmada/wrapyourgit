"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { layoutForSize, type RecapData, VIDEO_FORMATS, VIDEO_FPS } from "@wyg/schema";
import { SCENES, STORY_DURATION_IN_FRAMES, WrapStory } from "@wyg/video";
import { ARCHETYPE_LABELS } from "@wyg/video/copy";
import { congratsLetter } from "@wyg/video/letter";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Scene3D } from "@/components/scene3d/scene-3d";
import { button } from "@/components/ui";

const SCENE_TITLES: Record<string, string> = {
  intro: "Hello",
  contributions: "Contributions",
  rhythm: "Your rhythm",
  "tech-dna": "Languages",
  projects: "Projects",
  community: "Community",
  engineering: "Engineering",
  identity: "Your archetype",
  closing: "Summary",
};
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
  | { kind: "scene"; index: number }
  | { kind: "letter" }
  | { kind: "export" };

const STEPS: Step[] = [
  { kind: "welcome" },
  ...SCENES.map((_, index) => ({ kind: "scene" as const, index })),
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
    player.current?.[muted ? "mute" : "unmute"]();
  }, [muted]);

  const go = useCallback((delta: number) => {
    setStep((s) => Math.min(STEPS.length - 1, Math.max(0, s + delta)));
  }, []);

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
      ? (SCENE_TITLES[SCENES[current.index]?.id ?? ""] ?? "")
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
            onClick={() => setStep(i)}
            // A 44px tall hit area (R-03 touch target) around a thin visible bar.
            className="group flex h-11 min-w-0 flex-1 items-center"
          >
            <span
              className={`h-2 w-full rounded-full motion-safe:transition-colors ${i <= step ? "bg-cell" : "bg-paper/20 group-hover:bg-paper/40"}`}
            />
          </button>
        ))}
      </nav>

      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-extrabold sm:text-4xl" aria-live="polite">
          {title}
        </h1>
        <p className="text-base tabular-nums">
          {step + 1} / {STEPS.length}
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        {current?.kind === "welcome" && (
          <div className="grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
            <Scene3D
              art="hero"
              alt="Cell, the WrapYourGit mascot, waving in front of a 3D contribution graph"
              priority
              className="mx-auto w-full max-w-xl rounded-[var(--radius-control)] lg:max-w-none"
            />
            <div className="flex flex-col items-start gap-5">
              <p className="text-2xl font-bold">@{data.profile.login}</p>
              <p className="text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-6xl">
                Ready for your {year}?
              </p>
              <p className="max-w-md text-lg">
                Nine short chapters about the year you had. Each one waits for you, so take your
                time. There&apos;s sound: you can mute it any time.
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
          <div
            className={`grid w-full items-center gap-6 ${current?.kind === "scene" && SCENES[current.index]?.id === "identity" && data.identity.archetype ? "max-w-6xl lg:grid-cols-2" : "max-w-5xl"}`}
          >
            <Player
              ref={player}
              // One mount per scene: starts at the scene's first frame and plays inside its fence.
              key={sceneIndex}
              initialFrame={inFrame}
              autoPlay={current?.kind === "scene"}
              initiallyMuted={muted}
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
            {current?.kind === "scene" &&
              SCENES[current.index]?.id === "identity" &&
              data.identity.archetype && (
                <Scene3D
                  art={data.identity.archetype}
                  alt={`A 3D diorama of the ${ARCHETYPE_LABELS[data.identity.archetype]} archetype`}
                  className="rounded-[var(--radius-control)]"
                />
              )}
          </div>
          <div className="flex gap-3">
            <button type="button" className={button.quiet} onClick={replay}>
              Replay
            </button>
            <button
              type="button"
              className={button.quiet}
              aria-pressed={muted}
              onClick={() => setMuted((m) => !m)}
            >
              {muted ? "Sound off" : "Sound on"}
            </button>
          </div>
        </div>

        {current?.kind === "letter" && (
          <article className="grid w-full max-w-5xl items-start gap-8 rounded-[var(--radius-control)] bg-paper p-6 text-ink sm:p-10 lg:grid-cols-[1.4fr_1fr]">
            <div className="flex flex-col gap-4">
              <p className="text-3xl font-extrabold">{letter.greeting}</p>
              {letter.paragraphs.map((paragraph, i) => (
                <p
                  key={paragraph}
                  className="text-lg leading-relaxed motion-safe:animate-[rise_600ms_ease-out_both]"
                  style={{ animationDelay: `${150 + i * 220}ms` }}
                >
                  {paragraph}
                </p>
              ))}
              <p className="mt-2 text-lg font-bold">{letter.signOff}</p>
            </div>
            <Scene3D art="cell-proud" alt="Cell wearing a crown of lit cells, proud of your year" />
          </article>
        )}

        {current?.kind === "export" && (
          <div className="flex w-full max-w-5xl flex-col gap-8">
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.2fr]">
              <Scene3D art="cell-think" alt="Cell getting your files ready" />
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
                    className="h-auto w-full rounded-[var(--radius-control)] bg-paper/10"
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
