import type { ArchetypeId } from "@wyg/schema";
import { archetypeIdSchema } from "@wyg/schema";
import { archetypeRole, CAST } from "./cast";
import { CELL, type ChibiMotion, LOOP_SECONDS, type Look } from "./three/pose";

/*
 * The baked animations of Cell (scripts/render-art.ts, ADR-0013). Nothing in the browser runs
 * WebGL: the web pages show looping animated WebP, one loop of the rig (three/ChibiCell.tsx)
 * LOOP_SECONDS long, and the story world draws the still PNG baked at each motion's peak.
 * Pure data, so the web app can import it.
 */

/** Frames per second of the baked loops: "on twos" against the 30 fps story. */
export const BAKE_FPS = 15;
/** Frames in one loop. */
export const LOOP_FRAMES = LOOP_SECONDS * BAKE_FPS;

/** Cell's poses for the web pages (cutout-cell-*). */
export type CellPose = "wave" | "cheer" | "think" | "proud" | "sleep";

/** Web art, 1200 × 900 compositions: `public/art/<id>.webp` (loop) and `<id>.png` (still). */
export type WebArtId =
  | `cutout-cell-${CellPose}`
  | `cutout-${ArchetypeId}`
  | `skin-${ArchetypeId}`
  | "hero-cast";

export const WEB_ART_IDS = [
  "hero-cast",
  "cutout-cell-wave",
  "cutout-cell-cheer",
  "cutout-cell-think",
  "cutout-cell-proud",
  "cutout-cell-sleep",
  ...archetypeIdSchema.options.map((id) => `cutout-${id}` as const),
  ...archetypeIdSchema.options.map((id) => `skin-${id}` as const),
] as const satisfies readonly WebArtId[];

/** Cell's head alone, for the letterhead: `public/art/head-cell.webp` and `.png`. */
export const HEAD_ART_ID = "head-cell";

export type Pose = { look: Look; motion: ChibiMotion };

export const CELL_POSES: Record<CellPose, Pose> = {
  wave: CAST.intro,
  cheer: CAST.contributions,
  think: CAST["tech-dna"],
  proud: CAST.closing,
  sleep: archetypeRole(null),
};

/**
 * Sprite sheets (`public/sprites/<id>.webp`): LOOP_FRAMES square frames in a grid, framed straight
 * on, a little above. Still baked, but the story world no longer draws them; their removal is a
 * follow-up. `side` sprites face right.
 */
export type SpriteId =
  | "wave"
  | "cheer"
  | "think"
  | "hammer"
  | "proud"
  | "sleep"
  | "run-side"
  | "hop-side"
  | `arch-${ArchetypeId}`;

export const SPRITES: Record<SpriteId, Pose & { turn?: number }> = {
  wave: CAST.intro,
  cheer: CAST.contributions,
  think: CAST["tech-dna"],
  hammer: CAST.projects,
  proud: CAST.closing,
  sleep: archetypeRole(null),
  "run-side": { look: CELL, motion: "run", turn: 1.05 },
  "hop-side": { look: { ...CELL, eyes: "happy" }, motion: "cheer", turn: 1.05 },
  "arch-builder": archetypeRole("builder"),
  "arch-consistent": archetypeRole("consistent"),
  "arch-explorer": archetypeRole("explorer"),
  "arch-collaborator": archetypeRole("collaborator"),
  "arch-night-owl": archetypeRole("night-owl"),
  "arch-open-sourcer": archetypeRole("open-sourcer"),
};

export const SPRITE_IDS = Object.keys(SPRITES) as SpriteId[];

/** Sprite sheet layout: frames left to right, then top to bottom. */
export const SPRITE_SHEET = { size: 512, cols: 6, rows: 5 } as const;

/** Which sprite frame to show at `frame` of a composition running at `fps`. */
export function spriteFrame(frame: number, fps: number): number {
  const index = Math.floor((frame / fps) * BAKE_FPS);
  return ((index % LOOP_FRAMES) + LOOP_FRAMES) % LOOP_FRAMES;
}

/**
 * The loop frame that best shows each motion, for still PNGs (reduced motion, Open Graph, the
 * letter slide). On the beat itself every motion passes its neutral pose.
 */
const PEAK_SECONDS: Partial<Record<ChibiMotion, number>> = {
  run: 1.625,
  cheer: 1.75,
  groove: 1.75,
  hammer: 1.58,
  pass: 1.62,
  wave: 1.5,
  celebrate: 1.5,
};

export function peakFrame(motion: ChibiMotion): number {
  return Math.round((PEAK_SECONDS[motion] ?? 1.5) * BAKE_FPS) % LOOP_FRAMES;
}
