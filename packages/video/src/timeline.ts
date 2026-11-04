import type { FieldColor } from "./theme";

/**
 * The story's order, length in beats and field color, as plain data so it can be tested without
 * Remotion. Sections of the soundtrack line up with scene starts (timeline.test.ts checks it):
 * the kick enters on the first cut, the climax lands on identity and the outro on closing.
 * No two neighbouring scenes share a field, so every cell wipe is visible (RHYTHM 3).
 */
export const TIMELINE = [
  { id: "intro", beats: 8, field: "ink" },
  { id: "contributions", beats: 16, field: "persimmon" },
  { id: "rhythm", beats: 20, field: "paper" },
  { id: "tech-dna", beats: 16, field: "cobalt" },
  { id: "projects", beats: 16, field: "paper" },
  { id: "community", beats: 12, field: "cobalt" },
  { id: "engineering", beats: 14, field: "ink" },
  { id: "identity", beats: 16, field: "persimmon" },
  { id: "closing", beats: 14, field: "ink" },
] as const satisfies readonly { id: string; beats: number; field: FieldColor }[];

export type SceneId = (typeof TIMELINE)[number]["id"];

/** Beat at which a scene starts. */
export function startBeat(id: SceneId): number {
  let beat = 0;
  for (const scene of TIMELINE) {
    if (scene.id === id) return beat;
    beat += scene.beats;
  }
  throw new Error(`Unknown scene ${id}`);
}

export const TOTAL_BEATS = TIMELINE.reduce((sum, scene) => sum + scene.beats, 0);
