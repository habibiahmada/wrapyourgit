"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { layoutForSize, type RecapData, VIDEO_FORMATS, VIDEO_FPS } from "@wyg/schema";
import { sampleRecap, WorldStory } from "@wyg/video";
import { buildWorld, edgeSounds, TAP_SOUND } from "@wyg/video/world";
import { WORLD_TRACK, worldLoopSeconds } from "@wyg/video/world-track";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMusic } from "../use-music";
import {
  type ControllerState,
  carryStop,
  frameAt,
  initialState,
  request,
  settle,
} from "./controller";
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

/**
 * The story world as a full-screen tap story. The composition never plays: every frame comes from
 * `seekTo`, driven by the controller, so moving forward and back share one path and one cadence.
 */
export function WorldPlayer({ data, sample = false }: { data: RecapData; sample?: boolean }) {
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
    () => buildWorld(data, { width, height }, "interactive", VIDEO_FPS),
    [data, width, height],
  );

  // The controller lives in a ref (the frame loop reads it every tick); `at` mirrors it for render.
  const state = useRef<ControllerState>(initialState());
  const [at, setAt] = useState(0);
  const [muted, setMuted] = useState(false);
  const [faded, setFaded] = useState(false);
  const raf = useRef(0);
  const fade = useRef(0);

  const commit = useCallback((next: ControllerState) => {
    state.current = next;
    setAt(heading(next));
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

      step(direction);
    },
    [commit, music, reduced, sfx, stops, timeline],
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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      // A focused button or link activates itself on Enter and Space; handling them here too
      // would move twice.
      const onControl =
        event.target instanceof Element && event.target.closest("button, a[href]") !== null;
      if (event.key === "ArrowRight") go(1);
      else if (event.key === "ArrowLeft") go(-1);
      else if ((event.key === " " || event.key === "Enter") && !onControl) go(1);
      else if (event.key === "Escape") router.push("/dashboard");
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, router]);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    music.setMuted(next);
    sfx.setMuted(next);
  };

  const last = stops.length - 1;
  // The chrome sits on a copy of the stage box, so it stays under the progress bar when the
  // stage is letterboxed.
  const stage = {
    width: `min(100svw, calc(100svh * ${width} / ${height}))`,
    aspectRatio: `${width} / ${height}`,
  };

  return (
    <div className="fixed inset-0 grid place-items-center overflow-hidden bg-paper text-ink">
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
          component={WorldStory}
          inputProps={{ data, mode: "interactive", music: false }}
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
        onClick={() => go(-1)}
        className={`${zone(at <= 0)} left-0 w-1/3`}
      />
      <button
        type="button"
        aria-label="Next"
        aria-disabled={at >= last}
        onClick={() => go(1)}
        className={`${zone(at >= last)} right-0 left-1/3`}
      />

      <div className="pointer-events-none relative [grid-area:1/1]" style={stage}>
        {sample && (
          <p className="absolute top-4 left-3 rounded-md border border-ink/25 bg-paper/90 px-3 py-2 text-sm font-semibold">
            Sample data
          </p>
        )}
        <div className="pointer-events-auto absolute top-4 right-3 flex gap-2">
          <button
            type="button"
            aria-label="Sound"
            aria-pressed={!muted}
            onClick={toggleSound}
            className={CONTROL}
          >
            <SpeakerIcon muted={muted} />
          </button>
          <Link href="/dashboard" aria-label="Close story" className={CONTROL}>
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" />
            </svg>
          </Link>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        Stop {at + 1} of {stops.length}
      </p>
    </div>
  );
}

/**
 * Development fallback with the fixture. Lives on the client side: `@wyg/video`'s entry pulls in
 * React context, which a server component can't import.
 */
export function SampleWorldPlayer() {
  return <WorldPlayer data={sampleRecap} sample />;
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
