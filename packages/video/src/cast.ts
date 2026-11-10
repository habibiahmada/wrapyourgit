import type { ArchetypeId } from "@wyg/schema";
import type { PhotoId } from "./photos";
import { C } from "./three/palette";
import { CELL, type ChibiMotion, type Look } from "./three/pose";

/*
 * Cell's motion and gear per role, and each archetype's Cell. One mascot (ADR-0012). The baked
 * art reads these (art.ts, three/ArtStill.tsx, scripts/render-art.ts): the cutouts take a
 * role, the skins an archetype's.
 */

export type Role = { look: Look; motion: ChibiMotion };

/** An archetype's Cell also has a place: the photo behind it in the baked art (`skin-*`). */
export type ArchetypeRole = Role & {
  photo: PhotoId;
  /** Card tilt, degrees. */
  tilt: number;
};

/** The roles Cell plays in the baked art, named after the chapters they were first drawn for. */
export type CastId =
  | "intro"
  | "contributions"
  | "rhythm"
  | "tech-dna"
  | "projects"
  | "community"
  | "engineering"
  | "closing";

export const CAST: Record<CastId, Role> = {
  // Hello, waving.
  intro: { look: CELL, motion: "wave" },
  // The big number gets a jump.
  contributions: {
    look: { ...CELL, eyes: "happy" },
    motion: "cheer",
  },
  // Keeping the streak, in a sweatband.
  rhythm: { look: { ...CELL, gear: ["sweatband"] }, motion: "run" },
  // Working out the languages, glasses on.
  "tech-dna": { look: { ...CELL, gear: ["glasses"] }, motion: "think" },
  // Hammering on the beat, hard hat on.
  projects: {
    look: { ...CELL, gear: ["hardhat", "hammer"] },
    motion: "hammer",
  },
  // Celebrating the stars, in a scarf.
  community: { look: { ...CELL, gear: ["scarf"] }, motion: "celebrate" },
  // Grooving, headset on.
  engineering: { look: { ...CELL, gear: ["headset"] }, motion: "groove" },
  // Crowned, proud of the year.
  closing: {
    look: { ...CELL, eyes: "happy", gear: ["crown"] },
    motion: "proud",
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
export function archetypeRole(archetype: ArchetypeId | null): ArchetypeRole {
  if (!archetype) {
    return { look: { ...CELL, eyes: "sleepy" }, motion: "sleep", photo: "desk", tilt: -2 };
  }
  const body = ARCHETYPE_COLORS[archetype];
  const roles: Record<ArchetypeId, ArchetypeRole> = {
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
