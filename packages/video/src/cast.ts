import type { ArchetypeId } from "@wyg/schema";
import type { PhotoId } from "./photos";
import { C } from "./three/palette";
import { CELL, type ChibiMotion, type Look } from "./three/pose";
import type { SceneId } from "./timeline";

/*
 * Who appears in each scene, and where. One mascot: Cell, the host, in every scene, so the story
 * reads as one character's tour of the year. Variety comes from what Cell does and wears and
 * from the place behind it: every scene has its own pose, gear and backdrop photo.
 */

export type Role = {
  look: Look;
  motion: ChibiMotion;
  photo: PhotoId /** Card tilt, degrees. */;
  tilt: number;
};

export const CAST: Record<Exclude<SceneId, "identity">, Role> = {
  // At the desk where the year happened. Hello.
  intro: { look: CELL, motion: "wave", photo: "desk", tilt: -3 },
  // The big number gets fireworks.
  contributions: {
    look: { ...CELL, eyes: "happy" },
    motion: "cheer",
    photo: "fireworks",
    tilt: 4,
  },
  // On the track, keeping the streak.
  rhythm: { look: { ...CELL, gear: ["sweatband"] }, motion: "run", photo: "track", tilt: -4 },
  // In the stacks, working out the languages.
  "tech-dna": { look: { ...CELL, gear: ["glasses"] }, motion: "think", photo: "library", tilt: 3 },
  // In the workshop, hammering on the beat.
  projects: {
    look: { ...CELL, gear: ["hardhat", "hammer"] },
    motion: "hammer",
    photo: "workshop",
    tilt: -2,
  },
  // In a garden people tend together.
  community: { look: { ...CELL, gear: ["scarf"] }, motion: "celebrate", photo: "garden", tilt: 3 },
  // Among the gears, headset on.
  engineering: { look: { ...CELL, gear: ["headset"] }, motion: "groove", photo: "gears", tilt: -3 },
  // Sunset, crowned, proud of the year.
  closing: {
    look: { ...CELL, eyes: "happy", gear: ["crown"] },
    motion: "proud",
    photo: "sunset",
    tilt: 2,
  },
};

/**
 * Each archetype's colour for Cell's body. Distinct from each other and from the photo behind
 * it; Consistent keeps Cell's own green.
 */
export const ARCHETYPE_COLORS: Record<ArchetypeId, string> = {
  builder: "#FF8A3D",
  consistent: C.green,
  explorer: "#38BDF8",
  collaborator: "#FF7AB6",
  "night-owl": "#A78BFA",
  "open-sourcer": "#2DD4BF",
};

/**
 * Identity: Cell as the person's archetype, with that archetype's colour, gear, pose and place;
 * asleep at the desk when there is none.
 */
export function archetypeRole(archetype: ArchetypeId | null): Role {
  if (!archetype) {
    return { look: { ...CELL, eyes: "sleepy" }, motion: "sleep", photo: "desk", tilt: -2 };
  }
  const body = ARCHETYPE_COLORS[archetype];
  const roles: Record<ArchetypeId, Role> = {
    builder: {
      look: { ...CELL, body, gear: ["hardhat", "hammer"] },
      motion: "hammer",
      photo: "workshop",
      tilt: -3,
    },
    consistent: {
      look: { ...CELL, body, gear: ["sweatband"] },
      motion: "run",
      photo: "track",
      tilt: 3,
    },
    explorer: {
      look: { ...CELL, body, eyes: "happy", gear: ["cap", "backpack"] },
      motion: "wave",
      photo: "mountains",
      tilt: -2,
    },
    collaborator: {
      look: { ...CELL, body, eyes: "happy", gear: ["headset"] },
      motion: "pass",
      photo: "map",
      tilt: 2,
    },
    "night-owl": {
      look: { ...CELL, body, top: "tufts", gear: ["glasses"] },
      motion: "groove",
      photo: "skyline",
      tilt: -3,
    },
    "open-sourcer": {
      look: { ...CELL, body, eyes: "happy", gear: ["scarf"] },
      motion: "cheer",
      photo: "mural",
      tilt: 3,
    },
  };
  return roles[archetype];
}
