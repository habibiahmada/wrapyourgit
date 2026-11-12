"use client";

import {
  CUT_FADE_SECONDS,
  loops,
  RAILS_IN_SECONDS,
  SFX,
  type SfxName,
  sfxFile,
} from "@wyg/video/world";
import { useEffect, useMemo, useRef } from "react";

type Engine = {
  context: AudioContext;
  mute: GainNode;
  buffers: Map<SfxName, Promise<AudioBuffer | null>>;
};

export type Sfx = {
  /**
   * Call from a click or key handler: the first call creates the AudioContext (autoplay rules).
   * With `seconds`, the sound is cut there with a short fade (the rails, as long as the move).
   */
  play(name: SfxName, seconds?: number): void;
  setMuted(muted: boolean): void;
};

/**
 * One-shot effects on Web Audio rather than `new Audio()` per tap: each WAV is fetched and decoded
 * once, and a decoded buffer starts on the audio clock at once, so a tap sound lands on the tap.
 */
export function useSfx(): Sfx {
  const engine = useRef<Engine | null>(null);
  const muted = useRef(false);

  useEffect(
    () => () => {
      void engine.current?.context.close();
      engine.current = null;
    },
    [],
  );

  return useMemo<Sfx>(() => {
    const ensure = (): Engine => {
      if (engine.current) return engine.current;
      const context = new AudioContext();
      const mute = context.createGain();
      mute.gain.value = muted.current ? 0 : 1;
      mute.connect(context.destination);
      const created: Engine = { context, mute, buffers: new Map() };
      engine.current = created;
      // Warm every effect on the first gesture, so the arrival sound of the first move isn't late.
      for (const name of Object.keys(SFX) as SfxName[]) void buffer(created, name);
      return created;
    };

    const buffer = (e: Engine, name: SfxName) => {
      let decoded = e.buffers.get(name);
      if (!decoded) {
        decoded = fetch(`/${sfxFile(name)}`)
          .then((response) => response.arrayBuffer())
          .then((data) => e.context.decodeAudioData(data))
          // A missing effect stays silent; the story still moves.
          .catch(() => null);
        e.buffers.set(name, decoded);
      }
      return decoded;
    };

    return {
      play(name, seconds) {
        const e = ensure();
        void e.context.resume();
        void buffer(e, name).then((decoded) => {
          if (!decoded || engine.current !== e) return;
          const gain = e.context.createGain();
          gain.gain.value = SFX[name].volume;
          const source = e.context.createBufferSource();
          source.buffer = decoded;
          source.connect(gain).connect(e.mute);
          source.onended = () => gain.disconnect();
          const now = e.context.currentTime;
          const volume = SFX[name].volume;
          // A looping sound (the rails) goes round for `seconds`, rolling in as the train pulls away.
          const looping = loops(name) && seconds !== undefined;
          source.loop = looping;
          if (looping) {
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(volume, now + Math.min(seconds, RAILS_IN_SECONDS));
          }
          source.start(now);
          if (seconds !== undefined && (looping || seconds < decoded.duration)) {
            const fade = Math.min(seconds, CUT_FADE_SECONDS);
            gain.gain.setValueAtTime(volume, now + Math.max(0, seconds - fade));
            gain.gain.linearRampToValueAtTime(0, now + seconds);
            source.stop(now + seconds);
          }
        });
      },
      setMuted(next) {
        muted.current = next;
        const e = engine.current;
        if (e) e.mute.gain.setValueAtTime(next ? 0 : 1, e.context.currentTime);
      },
    };
  }, []);
}
