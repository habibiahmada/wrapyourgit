"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { type RecapData, VIDEO_FPS } from "@wyg/schema";
import { RideStory } from "@wyg/video";
import { buildRide } from "@wyg/video/ride";
import { edgeSounds, safeArea, TAP_SOUND } from "@wyg/video/world";
import { WORLD_TRACK, worldLoopSeconds } from "@wyg/video/world-track";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type ControllerState,
  carryStop,
  frameAt,
  idleOffset,
  initialState,
  request,
  restFrameAt,
  settle,
} from "./controller";
import { endScreenFor, shareCardFor } from "./end-screen";
import { ExportShelf } from "./export-shelf";
import { publicWorld } from "./public-world";
import { stageBox, stageSize } from "./stage-size";
import { useMusic } from "./use-music";
import { useSfx } from "./use-sfx";

const MUSIC_SRC = `/${WORLD_TRACK.file}`;
const MUSIC_LOOP = worldLoopSeconds();
/** Each half of the reduced-motion crossfade (out, then in). */
const FADE_MS = 200;

/*
 * Focus rings sit on the city, which can be paper, ink or anything between: an ink line between
 * two paper bands stays visible on all of them.
 */
const CONTROL_RING =
  "focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 focus-visible:shadow-[0_0_0_6px_var(--color-paper)]";
/**
 * The tap zones are the whole story: no tint on hover or press, and no focus ring, since they
 * never take focus. A keyboard moves the story with the arrow keys, Space and Enter from anywhere
 * on the page (the window's key handler), so the zones stay out of the Tab order, and a press does
 * not focus them: a box drawn round a third of the story at the next arrow key was only noise.
 * Screen readers still reach them as buttons, and the page says how to move.
 */
const zone = (disabled: boolean) =>
  `absolute inset-y-0 bg-transparent outline-none ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`;
/** How long a reader stays on a stop before the cue to tap on shows. */
const CUE_MS = 5000;
/** Keeps a press from moving focus to a tap zone. */
const keepFocus = (event: { preventDefault: () => void }) => event.preventDefault();
/**
 * How long the window must stay one size before the ride is rebuilt for it: a rebuild drops any
 * move in flight, so a drag across the screen edge should cost one, not dozens.
 */
const RESIZE_SETTLE_MS = 150;
const CONTROL = `grid size-11 cursor-pointer place-items-center rounded-md border border-ink/25 bg-paper/90 text-ink hover:bg-paper active:bg-ink/10 ${CONTROL_RING}`;

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
       * of their own. Escape calls `onExit`.
       */
      variant: "public";
      data: RecapData;
      onExit: () => void;
      title: string;
    };

/**
 * The story ride as a full-screen tap story. The composition never plays: every frame comes from
 * `seekTo`, driven by the controller, so moving forward and back share one path and one cadence.
 * At rest the controller's rest loop is played the same way.
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

  // The composition takes the shape of the box the story fills, so it covers the screen edge to
  // edge. The box is measured, not the window: Chrome on Android shrinks innerHeight for the
  // keyboard without resizing the page or firing a resize, so a shape read from the window right
  // after the username form came out too wide and cropped the Sound button off (issue #137).
  const screen = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(() => stageSize(1080, 1920));
  const [view, setView] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    const el = screen.current;
    if (!el) return;
    let timer = 0;
    let first = true;
    const pick = (width: number, height: number) => {
      const next = stageSize(width, height);
      setSize((now) => (now.width === next.width && now.height === next.height ? now : next));
    };
    const observer = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      // The stage follows the box at once; the ride is rebuilt only once the size settles.
      setView((now) => (now?.width === width && now.height === height ? now : { width, height }));
      window.clearTimeout(timer);
      if (first) {
        first = false;
        pick(width, height);
      } else timer = window.setTimeout(() => pick(width, height), RESIZE_SETTLE_MS);
    });
    observer.observe(el);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);
  const { width, height } = size;
  const { stops, timeline } = useMemo(
    () => buildRide(data, { width, height }, "interactive", VIDEO_FPS, { letter }),
    [data, width, height, letter],
  );

  // The controller lives in a ref (the frame loop reads it every tick); `at` mirrors it for render.
  const state = useRef<ControllerState>(initialState());
  const [at, setAt] = useState(0);
  // Mirrors `!state.moving`: the closing stop's icons show only once the camera has settled.
  const [resting, setResting] = useState(true);
  const [muted, setMuted] = useState(false);
  const [faded, setFaded] = useState(false);
  const raf = useRef(0);
  const fade = useRef(0);
  // At rest the ride loops its station's rest frames; this is that loop, and the phase it shows.
  const restRaf = useRef(0);
  const restPhase = useRef(0);
  // Idle motion carried into a move from where the rest loop was (see controller `idleOffset`).
  const [idle, setIdle] = useState(0);
  // A file is being made: the dialog over the story is up, and nothing else moves.
  const [busy, setBusy] = useState(false);
  // The cue to tap on, after CUE_MS resting at a stop with nothing pressed.
  const [cue, setCue] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const last = stops.length - 1;
  const login = data.profile.login;
  // A visitor keeps someone else's year: "your" would name the wrong person.
  const keepLabel = owner ? "Keep your year" : `Keep @${login}'s year`;
  const lastStopNote = `. ${keepLabel}: the files are on screen.`;
  const endScreen = endScreenFor(props.variant);
  const card = shareCardFor(props.variant, data);

  const commit = useCallback((next: ControllerState) => {
    state.current = next;
    setAt(heading(next));
    setResting(next.moving === null);
  }, []);

  const stopLoop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    cancelAnimationFrame(restRaf.current);
    window.clearTimeout(fade.current);
  }, []);

  const go = useCallback(
    (direction: 1 | -1) => {
      const begin = () => {
        const move = state.current.moving;
        if (!move) return;
        // The rest loop stops here, not on the next render: two loops must never seek in turn.
        cancelAnimationFrame(restRaf.current);
        sfx.play(TAP_SOUND);
        const sounds = edgeSounds(timeline, stops, move.from, move.to);
        // The wheels stop when the train does: the sound lasts as long as the move.
        const seconds = Math.abs(move.endFrame - move.startFrame) / VIDEO_FPS;
        if (sounds.travel) sfx.play(sounds.travel, reduced ? FADE_MS / 500 : seconds);
        if (!music.isPlaying()) music.play();

        const finish = () => {
          if (sounds.arrival) sfx.play(sounds.arrival);
          const { state: rested, next } = settle(state.current);
          setIdle(0);
          commit(rested);
          if (next !== null) step(next);
        };

        if (reduced) {
          setFaded(true);
          fade.current = window.setTimeout(() => {
            player.current?.seekTo(timeline.stopFrames[move.to] ?? move.endFrame);
            setFaded(false);
            finish();
          }, FADE_MS);
          return;
        }

        const start = performance.now();
        const tick = (now: number) => {
          const frame = frameAt(state.current, now - start, VIDEO_FPS);
          if (frame === null) return;
          setIdle(idleOffset(state.current, frame));
          player.current?.seekTo(frame);
          if (frame === move.endFrame) finish();
          else raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
      };

      const step = (dir: 1 | -1, phase = 0) => {
        const result = request(state.current, dir, timeline, reduced ? 0 : phase);
        commit(result.state);
        if (result.start) begin();
      };

      // The story ends at the closing stop: Next there does nothing.
      const rest = state.current;
      if (direction === 1 && !rest.moving && rest.stop >= last) return;
      // A tap at rest sets off from where the rest loop is; one during a move only queues.
      step(direction, rest.moving ? 0 : restPhase.current);
    },
    [commit, last, music, reduced, sfx, stops, timeline],
  );

  // A new size means new stops (the letter's page count varies) and new frames: drop any move in
  // flight and rest on the stop it was heading to, found by id in the new list.
  const restedIds = useRef<string[]>([]);
  useEffect(() => {
    stopLoop();
    setFaded(false);
    const ids = stops.map((s) => s.id);
    const stop = carryStop(restedIds.current, heading(state.current), ids);
    restedIds.current = ids;
    setIdle(0);
    commit({ stop, moving: null, queued: null });
    player.current?.seekTo(timeline.stopFrames[stop] ?? 0);
  }, [stops, timeline, commit, stopLoop]);

  useEffect(() => stopLoop, [stopLoop]);

  // A reader who stays on a stop is shown where to tap. Any move (a tap, an arrow key) leaves the
  // stop's rest and so takes the cue away; the closing stop has nowhere further to go.
  useEffect(() => {
    setCue(false);
    if (!resting || busy || at >= last) return;
    const timer = window.setTimeout(() => setCue(true), CUE_MS);
    return () => window.clearTimeout(timer);
  }, [resting, busy, at, last]);

  // While the camera rests, the station keeps moving: smoke, Cell blinking, its own small loop.
  // Not under reduced motion, and not behind the end screen.
  useEffect(() => {
    restPhase.current = 0;
    if (!resting || busy || reduced) return;
    const begun = performance.now();
    const loop = (now: number) => {
      const rested = state.current;
      if (rested.moving) return;
      const frame = restFrameAt(rested, now - begun, VIDEO_FPS, timeline);
      restPhase.current = frame - (timeline.stopFrames[rested.stop] ?? frame);
      player.current?.seekTo(frame);
      restRaf.current = requestAnimationFrame(loop);
    };
    restRaf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(restRaf.current);
  }, [resting, busy, reduced, timeline]);

  // The control that opened the story (the question's answer, the card's Play) unmounts or is
  // hidden on the same commit; without this, focus would fall back to <body>.
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      // The dialog over the story owns the keys while a file is made (Escape cancels it).
      if (busy) return;
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
  }, [busy, go, onExit, router]);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    music.setMuted(next);
    sfx.setMuted(next);
  };

  // The composition has the box's shape, so covering the screen crops at most a sliver (a
  // shape past 21:9, or a resize still settling). The chrome sits on a copy of the same box.
  // Until the box is measured (the server's render), viewport units stand in.
  const stage = view
    ? stageBox(view, size)
    : {
        width: `max(100dvw, calc(100dvh * ${width} / ${height}))`,
        aspectRatio: `${width} / ${height}`,
      };
  // Scene units kept clear of the progress bar (Sound sits under it) and of the copyright line.
  const { top: topClear, bottom: footerClear } = safeArea({ width, height });

  return (
    <div
      ref={screen}
      className="fixed inset-0 grid place-items-center overflow-hidden bg-ink text-ink"
    >
      <h1 ref={titleRef} tabIndex={-1} className="sr-only">
        {props.title}
      </h1>
      <p className="sr-only">
        Use the right and left arrow keys, or tap the right and left of the screen, to move through
        the story.
      </p>
      <div
        className="[grid-area:1/1]"
        style={{
          ...stage,
          opacity: faded ? 0 : 1,
          transition: reduced ? `opacity ${FADE_MS}ms linear` : undefined,
        }}
      >
        <Player
          ref={player}
          component={RideStory}
          inputProps={{ data, mode: "interactive", music: false, letter, idle }}
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
        tabIndex={-1}
        onMouseDown={keepFocus}
        onClick={() => go(-1)}
        className={`${zone(at <= 0)} left-0 w-1/3`}
      />
      <button
        type="button"
        aria-label="Next"
        aria-disabled={at >= last}
        tabIndex={-1}
        onMouseDown={keepFocus}
        onClick={() => go(1)}
        className={`${zone(at >= last)} right-0 left-1/3`}
      />

      {/* The cue to tap on: after a while at a stop with nothing pressed, the right of the screen
          darkens and shows "»". Decoration over the Next zone, never in the way of a tap. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 grid w-1/3 place-items-center bg-gradient-to-l from-ink/55 via-ink/20 to-transparent motion-safe:transition-opacity motion-safe:duration-500 ${
          cue ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="grid size-16 place-items-center rounded-full bg-paper/90 text-ink shadow-[0_0_0_6px_rgba(244,239,227,0.25)]">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className={`size-8 ${cue ? "motion-safe:animate-[nudge_1.2s_ease-in-out_3]" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="square"
            strokeLinejoin="miter"
          >
            <path d="M5 6l6 6-6 6M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>

      {/* An inline-size container: the Sound control and the shelf sit in scene units
          (1 unit = 0.1cqw). */}
      <div
        className="pointer-events-none relative [container-type:inline-size] [grid-area:1/1]"
        style={stage}
      >
        {/* Web-only, like the cue: drawn over the story, never part of a file. Top right, just
            under the progress bar. */}
        <button
          type="button"
          aria-label="Sound"
          aria-pressed={!muted}
          onClick={toggleSound}
          className={`pointer-events-auto absolute right-3 ${CONTROL}`}
          style={{ top: `${(topClear / 10).toFixed(3)}cqw` }}
        >
          <SpeakerIcon muted={muted} />
        </button>
        {/* Web-only, never part of the composition or a file: bottom right, just above the
            copyright line. The closing camera leaves that corner to grass: below the train in a
            tall frame, beside it in a wide one. */}
        {resting && at === last && (
          <div
            className="pointer-events-auto absolute right-3"
            style={{ bottom: `${(footerClear / 10).toFixed(3)}cqw` }}
          >
            <ExportShelf
              data={data}
              title={keepLabel}
              privateNames={privateNames}
              card={card}
              letter={letter}
              links={endScreen.links}
              onBusyChange={setBusy}
            />
          </div>
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
