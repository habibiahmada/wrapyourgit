import type { ArchetypeId } from "@wyg/schema";
import { C } from "./three/palette";
import { CELL, type ChibiMotion, type Look } from "./three/pose";
import type { SceneId } from "./timeline";

/*
 * Who appears in each scene, and what they do. A different character for every scene (colour,
 * head, eyes, what it wears) so the story has a cast, not one mascot pasted nine times. Colours
 * are picked against the scene's field so every character stands out from it. Cell, the host,
 * opens, takes the archetype and closes.
 */

export type Role = { look: Look; motion: ChibiMotion };

export const CAST: Record<Exclude<SceneId, "community" | "identity">, Role> = {
  // Ink field. The host says hello.
  intro: { look: CELL, motion: "wave" },
  // Persimmon field. A round blue fan with antennas, jumping for the big number.
  contributions: {
    look: { body: C.cobalt, head: "round", eyes: "happy", top: "antennas" },
    motion: "cheer",
  },
  // Paper field. A slim dark-green runner with a visor and a sweatband, keeping the streak.
  rhythm: {
    look: {
      body: C.heat[3],
      head: "tall",
      eyes: "visor",
      top: "none",
      gear: ["sweatband"],
      slim: true,
    },
    motion: "run",
  },
  // Cobalt field. A cream boxy thinker with glasses, working out the languages.
  "tech-dna": {
    look: { body: C.paper, head: "cube", eyes: "dots", top: "ball", gear: ["glasses"] },
    motion: "think",
  },
  // Paper field. A wide persimmon builder in a hard hat, hammering on the beat.
  projects: {
    look: {
      body: C.persimmon,
      head: "wide",
      eyes: "cells",
      top: "none",
      gear: ["hardhat", "hammer"],
    },
    motion: "hammer",
  },
  // Ink field. A mint collaborator in a headset, nodding along.
  engineering: {
    look: { body: C.heat[0], head: "squircle", eyes: "dots", top: "none", gear: ["headset"] },
    motion: "groove",
  },
  // Ink field. Cell again, crowned, proud of the year.
  closing: {
    look: { ...CELL, eyes: "happy", gear: ["crown"] },
    motion: "proud",
  },
};

/** Community: three friends passing a contribution cell, Cell in the middle. */
export const CREW: { look: Look; x: number; seed: number }[] = [
  { look: { body: C.heat[0], head: "round", eyes: "dots", top: "antennas" }, x: -1.35, seed: 1 },
  { look: CELL, x: 0, seed: 0 },
  { look: { body: C.heat[2], head: "cube", eyes: "happy", top: "ball" }, x: 1.35, seed: 2 },
];

/** Identity: Cell dressed as the person's archetype, celebrating; asleep when there is none. */
export function archetypeRole(archetype: ArchetypeId | null): Role {
  if (!archetype) return { look: { ...CELL, eyes: "sleepy" }, motion: "sleep" };
  const gear: Record<ArchetypeId, Look> = {
    builder: { ...CELL, gear: ["hardhat", "hammer"] },
    consistent: { ...CELL, gear: ["sweatband"] },
    explorer: { ...CELL, gear: ["cap", "backpack"] },
    collaborator: { ...CELL, gear: ["headset"] },
    "night-owl": { ...CELL, top: "tufts", eyes: "happy" },
    "open-sourcer": { ...CELL, gear: ["scarf"] },
  };
  return { look: gear[archetype], motion: "celebrate" };
}
