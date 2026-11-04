import type { FieldColor } from "./theme";

/** One move per cut, never repeated (SceneTransition). */
export type TransitionVariant =
  | "dive"
  | "tilt"
  | "pan"
  | "iris"
  | "blinds"
  | "flip"
  | "flash"
  | "pullback";

/**
 * The story's order, length in beats and field color, as plain data so it can be tested without
 * Remotion. Sections of the soundtrack line up with scene starts (timeline.test.ts checks it):
 * the kick enters on the first cut, the climax lands on identity and the outro on closing.
 * No two neighbouring scenes share a field, so every cell transition is visible (RHYTHM 3).
 * `transition` is how the scene takes over from the one before it (SceneTransition): every cut
 * has its own move, chosen for what the two scenes show; the climax gets the flash.
 */
export const TIMELINE = [
  { id: "intro", beats: 8, field: "ink" },
  { id: "contributions", beats: 16, field: "persimmon", transition: "dive" },
  { id: "rhythm", beats: 20, field: "paper", transition: "tilt" },
  { id: "tech-dna", beats: 16, field: "cobalt", transition: "pan" },
  { id: "projects", beats: 16, field: "paper", transition: "iris" },
  { id: "community", beats: 12, field: "cobalt", transition: "blinds" },
  { id: "engineering", beats: 14, field: "ink", transition: "flip" },
  { id: "identity", beats: 16, field: "persimmon", transition: "flash" },
  { id: "closing", beats: 14, field: "ink", transition: "pullback" },
] as const satisfies readonly {
  id: string;
  beats: number;
  field: FieldColor;
  transition?: TransitionVariant;
}[];

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
