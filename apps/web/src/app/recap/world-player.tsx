"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { layoutForSize, type RecapData, VIDEO_FORMATS, VIDEO_FPS } from "@wyg/schema";
import { WorldStory } from "@wyg/video";
import { buildWorld, edgeSounds, safeArea, TAP_SOUND } from "@wyg/video/world";
import { WORLD_TRACK, worldLoopSeconds } from "@wyg/video/world-track";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type ControllerState,
  carryStop,
  frameAt,
  initialState,
  request,
  settle,
} from "./controller";
import { endScreenFor, shareCardFor } from "./end-screen";
import { ExportPanel } from "./export-panel";
import { PAPER_BUTTON } from "./paper-button";
import { publicWorld } from "./public-world";
import { useMusic } from "./use-music";
import { useSfx } from "./use-sfx";

const FORMAT_FOR_LAYOUT = { portrait: "9x16", compact: "4x5", landscape: "16x9" } as const;
const MUSIC_SRC = `/${WORLD_TRACK.file}`;
const MUSIC_LOOP = worldLoopSeconds();
/** Each half of the reduced-motion crossfade (out, then in). */
const FADE_MS = 200;

/*
 * Focus rings sit on the city, which can be paper, ink or anything between: an ink line between
 * two paper bands stays visible on all of them. The tap zones fill the screen, so theirs is inset.
 */
const ZONE_RING =
  "focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-[-4px] focus-visible:shadow-[inset_0_0_0_6px_var(--color-paper)]";
const CONTROL_RING =
  "focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 focus-visible:shadow-[0_0_0_6px_var(--color-paper)]";
/** A zone at the end of the story stays focusable (focus must not vanish under the reader). */
const zone = (disabled: boolean) =>
  `absolute inset-y-0 bg-transparent ${disabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-ink/[0.03] active:bg-ink/[0.07]"} ${ZONE_RING}`;
/**
 * A strip above the stage that holds the web-only controls (Sound, Close). They
 * are not part of the composition, so the scenes' safe area can't keep text clear of them; the
 * stage shrinks to fit under the strip instead, and exports never see it. 44 px controls plus
 * 8 px either side, in rem so it grows with them under text zoom.
 */
const CONTROL_BAND = "3.75rem";
/**
 * The way on at the rested closing stop. Paper like the other controls: the closing sky is dark,
 * so a paper fill is what stands out there; the words, not an icon, say where it goes.
 */
const CUE = `inline-flex min-h-11 max-w-[calc(100%-1.5rem)] cursor-pointer items-center rounded-md border border-ink/25 bg-paper/90 px-4 py-2 text-left font-semibold text-ink [overflow-wrap:anywhere] hover:bg-paper active:bg-ink/10 ${CONTROL_RING}`;
const CONTROL = `grid size-11 cursor-pointer place-items-center rounded-md border border-ink/25 bg-paper/90 text-ink hover:bg-paper active:bg-ink/10 ${CONTROL_RING}`;
/** Close while a render runs: faded, no hover tint; the base layer's not-allowed cursor shows. */
const CONTROL_OFF = `grid size-11 place-items-center rounded-md border border-ink/25 bg-paper/90 text-ink opacity-50 ${CONTROL_RING}`;
/** Why every way out is off while a render runs; the end screen shows it under its buttons. */
const LEAVE_BLOCKED = "leave-blocked";

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** The stop the camera is at or heading to: what Previous and Next are relative to. */
function heading(state: ControllerState): number {
  return state.moving ? state.moving.to : state.stop;
}

export type WorldPlayerProps =
  | {
      /**
       * The owner on their own /<username>: the letter, and "Keep your year" with the files after
       * the last stop.
       */
      variant: "owner";
      /**
       * The owner's story projection (`storyData`): private names only when they chose to show
       * them. The story and the "Keep your year" files both use it, so the files follow the choice.
       */
      data: RecapData;
      /** True when `data` names a private repository: the end screen then says the files do too. */
      privateNames: boolean;
      /** The page's only h1, focused when the story opens. */
      title: string;
    }
  | {
      /**
       * A visitor on someone else's /<username>: the public projection (`publicWorld`), no
       * letter. After the last stop, the files made from that projection and the ways to a recap
       * of their own. Close and Escape call `onExit`.
       */
      variant: "public";
      data: RecapData;
      onExit: () => void;
      title: string;
    };

/**
 * The story world as a full-screen tap story. The composition never plays: every frame comes from
 * `seekTo`, driven by the controller, so moving forward and back share one path and one cadence.
 */
export function WorldPlayer(props: WorldPlayerProps) {
  const owner = props.variant === "owner";
  const privateNames = owner && props.privateNames;
  const onExit = owner ? null : props.onExit;
  // Decided here, not by the caller: a visitor's story is the public projection whatever it gets.
  const { data, letter } = useMemo(
    () =>
      props.variant === "public" ? publicWorld(props.data) : { data: props.data, letter: true },
    [props.variant, props.data],
  );
  const router = useRouter();
  const player = useRef<PlayerRef>(null);
  const music = useMusic(MUSIC_SRC, MUSIC_LOOP);
  const sfx = useSfx();
  const reduced = useReducedMotion();

  const [format, setFormat] = useState<keyof typeof VIDEO_FORMATS>("9x16");
  useEffect(() => {
    const pick = () =>
      setFormat(FORMAT_FOR_LAYOUT[layoutForSize(window.innerWidth, window.innerHeight)]);
    pick();
    window.addEventListener("resize", pick);
    return () => window.removeEventListener("resize", pick);
  }, []);
  const { width, height } = VIDEO_FORMATS[format];
  const { stops, timeline } = useMemo(
    () => buildWorld(data, { width, height }, "interactive", VIDEO_FPS, { letter }),
    [data, width, height, letter],
  );

  // The controller lives in a ref (the frame loop reads it every tick); `at` mirrors it for render.
  const state = useRef<ControllerState>(initialState());
  const [at, setAt] = useState(0);
  // Mirrors `!state.moving`: the end-screen cue shows only once the camera has settled.
  const [resting, setResting] = useState(true);
  const [muted, setMuted] = useState(false);
  const [faded, setFaded] = useState(false);
  const raf = useRef(0);
  const fade = useRef(0);
  // "Keep your year": a web-only screen over the paused closing stop, never part of the story.
  const [ended, setEnded] = useState(false);
  const [busy, setBusy] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const endHeading = useRef<HTMLHeadingElement>(null);
  const nextZone = useRef<HTMLButtonElement>(null);
  const cue = useRef<HTMLButtonElement>(null);
  const last = stops.length - 1;
  const login = data.profile.login;
  // A visitor keeps someone else's year: "your" would name the wrong person.
  const keepLabel = owner ? "Keep your year" : `Keep @${login}'s year`;
  const lastStopNote = `. ${keepLabel} is next.`;
  const endScreen = endScreenFor(props.variant);
  const card = shareCardFor(props.variant, data);
  // Scene units kept clear of the copyright line (the composition's own safe area).
  const footerClear = safeArea({ width, height }).bottom;

  const commit = useCallback((next: ControllerState) => {
    state.current = next;
    setAt(heading(next));
    setResting(next.moving === null);
  }, []);

  const stopLoop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    window.clearTimeout(fade.current);
  }, []);

  const go = useCallback(
    (direction: 1 | -1) => {
      const begin = () => {
        const move = state.current.moving;
        if (!move) return;
        sfx.play(TAP_SOUND);
        const sounds = edgeSounds(timeline, stops, move.from, move.to);
        if (sounds.travel) sfx.play(sounds.travel);
        if (!music.isPlaying()) music.play();

        const finish = () => {
          if (sounds.arrival) sfx.play(sounds.arrival);
          const { state: rested, next } = settle(state.current);
          commit(rested);
          if (next !== null) step(next);
        };

        if (reduced) {
          setFaded(true);
          fade.current = window.setTimeout(() => {
            player.current?.seekTo(move.endFrame);
            setFaded(false);
            finish();
          }, FADE_MS);
          return;
        }

        const start = performance.now();
        const tick = (now: number) => {
          const frame = frameAt(state.current, now - start, VIDEO_FPS);
          if (frame === null) return;
          player.current?.seekTo(frame);
          if (frame === move.endFrame) finish();
          else raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
      };

      const step = (dir: 1 | -1) => {
        const result = request(state.current, dir, timeline);
        commit(result.state);
        if (result.start) begin();
      };

      // Next at the rested closing stop opens the end screen. Only a fresh tap does: a tap queued
      // during the flight in must not end the story before the closing stop has been seen.
      const rest = state.current;
      if (direction === 1 && !rest.moving && rest.stop >= last) {
        setEnded(true);
        return;
      }
      step(direction);
    },
    [commit, last, music, reduced, sfx, stops, timeline],
  );

  // A new format means new stops (the letter's page count varies) and new frames: drop any move in
  // flight and rest on the stop it was heading to, found by id in the new list.
  const restedIds = useRef<string[]>([]);
  useEffect(() => {
    stopLoop();
    setFaded(false);
    const ids = stops.map((s) => s.id);
    const stop = carryStop(restedIds.current, heading(state.current), ids);
    restedIds.current = ids;
    commit({ stop, moving: null, queued: null });
    player.current?.seekTo(timeline.stopFrames[stop] ?? 0);
  }, [stops, timeline, commit, stopLoop]);

  useEffect(() => stopLoop, [stopLoop]);

  const closeEnd = useCallback(() => {
    setEnded(false);
    // The screen's own controls unmount; hand focus back to the cue that opened it, which is back
    // by the next frame. The Next zone is the fallback, should the cue not be there.
    requestAnimationFrame(() => (cue.current ?? nextZone.current)?.focus());
  }, []);

  // The control that opened the story (the question's answer, the card's Play) unmounts or is
  // hidden on the same commit; without this, focus would fall back to <body>.
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (ended) endHeading.current?.focus();
  }, [ended]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (ended) {
        // Arrow keys belong to the format radios while one has focus. A running render keeps the
        // screen until it ends or is cancelled: Escape, Back, Close and the links all wait, since
        // leaving would throw away minutes of encoding without a word.
        const onField = event.target instanceof Element && event.target.closest("input") !== null;
        if (event.key === "Escape" && !busy) {
          if (onExit) onExit();
          else router.push("/dashboard");
        } else if (event.key === "ArrowLeft" && !onField && !busy) closeEnd();
        else return;
        event.preventDefault();
        return;
      }
      // A focused button or link activates itself on Enter and Space; handling them here too
      // would move twice.
      const onControl =
        event.target instanceof Element && event.target.closest("button, a[href]") !== null;
      if (event.key === "ArrowRight") go(1);
      else if (event.key === "ArrowLeft") go(-1);
      else if ((event.key === " " || event.key === "Enter") && !onControl) go(1);
      else if (event.key === "Escape") {
        if (onExit) onExit();
        else router.push("/dashboard");
      } else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, closeEnd, ended, go, onExit, router]);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    music.setMuted(next);
    sfx.setMuted(next);
  };

  // The chrome sits on a copy of the stage box, so it stays under the progress bar when the
  // stage is letterboxed. The stage fits in what the controls' band leaves below it.
  const stageWidth = `min(100svw, calc((100svh - ${CONTROL_BAND}) * ${width} / ${height}))`;
  const stage = { width: stageWidth, aspectRatio: `${width} / ${height}` };
  // Where the stage starts: centred in the height the band leaves. The controls end just above.
  const stageTop = `calc(${CONTROL_BAND} + (100svh - ${CONTROL_BAND} - ${stageWidth} * ${height} / ${width}) / 2)`;

  return (
    <div
      className="fixed inset-0 grid place-items-center overflow-hidden bg-paper text-ink"
      style={{ paddingTop: CONTROL_BAND }}
    >
      <h1 ref={titleRef} tabIndex={-1} className="sr-only">
        {props.title}
      </h1>
      <div
        className="[grid-area:1/1]"
        inert={ended}
        style={{
          ...stage,
          opacity: faded ? 0 : 1,
          transition: reduced ? `opacity ${FADE_MS}ms linear` : undefined,
        }}
      >
        <Player
          ref={player}
          component={WorldStory}
          inputProps={{ data, mode: "interactive", music: false, letter }}
          durationInFrames={timeline.durationInFrames}
          fps={VIDEO_FPS}
          compositionWidth={width}
          compositionHeight={height}
          initialFrame={timeline.stopFrames[0] ?? 0}
          clickToPlay={false}
          spaceKeyToPlayOrPause={false}
          acknowledgeRemotionLicense
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Over the whole screen, letterbox included: a tap anywhere should count. */}
      <button
        type="button"
        aria-label="Previous"
        aria-disabled={at <= 0}
        inert={ended}
        onClick={() => go(-1)}
        className={`${zone(at <= 0)} left-0 w-1/3`}
      />
      {/* Never disabled: at the closing stop, Next opens the end screen. */}
      <button
        ref={nextZone}
        type="button"
        aria-label="Next"
        inert={ended}
        onClick={() => go(1)}
        className={`${zone(false)} right-0 left-1/3`}
      />

      {ended && (
        <section
          aria-labelledby="keep-your-year"
          className="on-light absolute inset-0 overflow-y-auto bg-paper/85"
        >
          {/* Top padding clears the Sound and Close controls, which stay usable above it. */}
          <div
            className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-4 pb-8"
            style={{ paddingTop: stageTop }}
          >
            <div className="flex flex-col gap-6 rounded-xl border border-ink/25 bg-paper p-5 sm:p-8">
              <div className="flex flex-col gap-2">
                <h2
                  id="keep-your-year"
                  ref={endHeading}
                  tabIndex={-1}
                  className="text-3xl font-bold tracking-tight [overflow-wrap:anywhere] sm:text-4xl"
                >
                  {keepLabel}
                </h2>
                <p className="text-lg text-ink-soft [overflow-wrap:anywhere]">
                  {owner ? (
                    <>
                      Your story as files to keep and post, made in this browser.
                      {privateNames ? "" : " Private repositories are never named."}
                    </>
                  ) : (
                    `@${login}'s story as files to keep and post, made in this browser from their public GitHub activity.`
                  )}
                </p>
              </div>
              {endScreen.exports && (
                <ExportPanel
                  data={data}
                  privateNames={privateNames}
                  card={card}
                  letter={letter}
                  onBusyChange={setBusy}
                />
              )}
              <div className="flex flex-col gap-3 border-t border-ink/25 pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    disabled={busy}
                    aria-describedby={busy ? LEAVE_BLOCKED : undefined}
                    onClick={closeEnd}
                    className={PAPER_BUTTON.secondary}
                  >
                    Back to the story
                  </button>
                  {endScreen.links.map((link) =>
                    busy ? (
                      <button
                        key={link.href}
                        type="button"
                        disabled
                        aria-describedby={LEAVE_BLOCKED}
                        className={PAPER_BUTTON.secondary}
                      >
                        {link.label}
                      </button>
                    ) : link.route ? (
                      <a key={link.href} href={link.href} className={PAPER_BUTTON.secondary}>
                        {link.label}
                      </a>
                    ) : (
                      <Link key={link.href} href={link.href} className={PAPER_BUTTON.secondary}>
                        {link.label}
                      </Link>
                    ),
                  )}
                </div>
                {busy && (
                  <p id={LEAVE_BLOCKED} className="text-base text-ink-soft">
                    Cancel the render first to go back to the story or leave it.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* An inline-size container, so the cue can sit in scene units (1 unit = 0.1cqw). */}
      <div
        className="pointer-events-none relative [container-type:inline-size] [grid-area:1/1]"
        style={stage}
      >
        <div
          className="absolute inset-x-3 bottom-full flex items-center justify-end gap-2"
          style={{ height: CONTROL_BAND }}
        >
          <div className="pointer-events-auto flex gap-2">
            <button
              type="button"
              aria-label="Sound"
              aria-pressed={!muted}
              onClick={toggleSound}
              className={CONTROL}
            >
              <SpeakerIcon muted={muted} />
            </button>
            {/* Client navigation (or the visitor's exit, which unmounts the panel), so the panel's
                beforeunload guard can't catch it: off while busy. */}
            {busy ? (
              <button
                type="button"
                disabled
                aria-label="Close story"
                aria-describedby={LEAVE_BLOCKED}
                className={CONTROL_OFF}
              >
                <CloseIcon />
              </button>
            ) : onExit ? (
              <button type="button" aria-label="Close story" onClick={onExit} className={CONTROL}>
                <CloseIcon />
              </button>
            ) : (
              <Link href="/dashboard" aria-label="Close story" className={CONTROL}>
                <CloseIcon />
              </Link>
            )}
          </div>
        </div>
        {/* Web-only, never part of the composition or a file. Bottom-left, just above the
            copyright line's safe area: the closing scene keeps that corner to the skyline (Cell
            stands centre in tall frames, right in landscape; the text is at the top or left-top).
            After Close in tab order: it is the last control, so its visual spot can differ. */}
        {resting && at === last && !ended && (
          <button
            ref={cue}
            type="button"
            onClick={() => setEnded(true)}
            className={`pointer-events-auto absolute left-3 ${CUE}`}
            style={{ bottom: `${(footerClear / 10).toFixed(3)}cqw` }}
          >
            {keepLabel}
          </button>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {/* Opening the end screen is announced by focusing its heading, not here. */}
        Stop {at + 1} of {stops.length}
        {resting && at === last ? lastStopNote : ""}
      </p>
    </div>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none">
      <path d="M3 8h3l4-3.5v11L6 12H3z" fill="currentColor" />
      {muted ? (
        <path d="M13 7.5l5 5M18 7.5l-5 5" stroke="currentColor" strokeWidth="1.8" />
      ) : (
        <path
          d="M13 7a4 4 0 0 1 0 6M15.5 4.5a7.5 7.5 0 0 1 0 11"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      )}
    </svg>
  );
}
