"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

type Engine = {
  context: AudioContext;
  buffer: Promise<AudioBuffer>;
  /** Sound toggle; stays put while tracks start and stop. */
  mute: GainNode;
  source?: AudioBufferSourceNode;
  /** Per playback, so a fade-out never touches the next start. */
  fade?: GainNode;
  /** Set while the buffer is still decoding and a start is wanted. */
  pending?: object;
};

export type Music = {
  /** Starts from the top (call from a click or key handler: autoplay rules). */
  play(): void;
  /** Ramps to silence over `ms`, then stops. Returns a cancel that restores full volume. */
  fadeOut(ms?: number): () => void;
  setMuted(muted: boolean): void;
  isPlaying(): boolean;
};

/**
 * The story's soundtrack on Web Audio instead of <audio loop>. A decoded buffer loops
 * sample-exact between `loop.start` and `loop.end` (seconds): an AAC file in <audio loop>
 * restarts with its encoder padding and leaves an audible gap. The first pass plays from 0
 * through `loop.end`, then the loop region repeats for as long as the chapters last.
 * Fades run on the audio clock, so they finish in background tabs too.
 */
export function useMusic(src: string, loop: { start: number; end: number }): Music {
  const engine = useRef<Engine | null>(null);
  const muted = useRef(false);

  const ensure = useCallback((): Engine => {
    if (engine.current) return engine.current;
    const context = new AudioContext();
    const mute = context.createGain();
    mute.gain.value = muted.current ? 0 : 1;
    mute.connect(context.destination);
    const buffer = fetch(src)
      .then((response) => response.arrayBuffer())
      .then((data) => context.decodeAudioData(data));
    engine.current = { context, buffer, mute };
    return engine.current;
  }, [src]);

  const stop = useCallback(() => {
    const e = engine.current;
    if (!e) return;
    e.pending = undefined;
    try {
      e.source?.stop();
    } catch {
      // Already stopped.
    }
    e.source?.disconnect();
    e.fade?.disconnect();
    e.source = undefined;
    e.fade = undefined;
  }, []);

  useEffect(
    () => () => {
      stop();
      void engine.current?.context.close();
      engine.current = null;
    },
    [stop],
  );

  return useMemo<Music>(
    () => ({
      play() {
        const e = ensure();
        void e.context.resume();
        if (e.source || e.pending) return;
        const token = {};
        e.pending = token;
        e.buffer
          .then((buffer) => {
            if (e.pending !== token) return;
            e.pending = undefined;
            const fade = e.context.createGain();
            const source = e.context.createBufferSource();
            source.buffer = buffer;
            source.loop = true;
            source.loopStart = loop.start;
            source.loopEnd = loop.end;
            source.connect(fade).connect(e.mute);
            source.start();
            e.source = source;
            e.fade = fade;
          })
          .catch(() => {
            // No music is better than a broken story: the effects and pictures still play.
            if (e.pending === token) e.pending = undefined;
          });
      },
      fadeOut(ms = 1400) {
        const e = engine.current;
        if (!e) return () => {};
        if (!e.source || !e.fade) {
          e.pending = undefined;
          return () => {};
        }
        const { source, fade, context } = e;
        const now = context.currentTime;
        fade.gain.cancelScheduledValues(now);
        fade.gain.setValueAtTime(fade.gain.value, now);
        fade.gain.linearRampToValueAtTime(0, now + ms / 1000);
        const timer = window.setTimeout(() => {
          if (e.source === source) stop();
        }, ms + 50);
        return () => {
          window.clearTimeout(timer);
          if (e.source !== source) return;
          fade.gain.cancelScheduledValues(context.currentTime);
          fade.gain.setValueAtTime(1, context.currentTime);
        };
      },
      setMuted(next) {
        muted.current = next;
        const e = engine.current;
        if (e) e.mute.gain.setValueAtTime(next ? 0 : 1, e.context.currentTime);
      },
      isPlaying() {
        const e = engine.current;
        return Boolean(e && (e.source || e.pending));
      },
    }),
    [ensure, stop, loop.start, loop.end],
  );
}
