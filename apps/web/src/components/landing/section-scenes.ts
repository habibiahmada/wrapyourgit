import type { ArchetypeId } from "@wyg/schema";
import { type Box, TONES, type Tone, type Vec } from "./iso";

/*
 * The landing sections' isometric dioramas, as plain data so they are tested without a DOM.
 * Each archetype's scene draws its rule (metrics.md), not a costume: the Builder stacks new
 * blocks, the Consistent keeps an even streak, and so on.
 */

export type Scene = { boxes: Box[]; glyphs: Glyph[] };
export type Glyph =
  | { kind: "moon"; at: Vec }
  | { kind: "link"; from: Vec; to: Vec }
  | { kind: "flap"; at: Vec; width: number; depth: number }
  | { kind: "keyhole"; at: Vec };

/** A dark roof-less tower with a green roof, like the hero's city. */
const tower = (roof: Tone): Tone => ({
  top: roof.top,
  left: TONES.dark.left,
  right: TONES.dark.right,
});

const plinth = (w = 4.4, d = 4.4): Box => ({
  at: [-0.2, -0.2, -0.45],
  size: [w, d, 0.45],
  tone: TONES.deep,
});

const block = (at: Vec, size: Vec, tone: Tone = TONES.dark): Box => ({ at, size, tone });

export function archetypeScene(id: ArchetypeId): Scene {
  switch (id) {
    case "builder":
      // New repositories going up: one stack, each block smaller, the newest lowered on a line.
      return {
        boxes: [
          plinth(),
          block([0.5, 0.5, 0], [3, 3, 0.8], tower(TONES.low)),
          block([0.95, 0.95, 0.8], [2.1, 2.1, 0.8], tower(TONES.mid)),
          block([1.4, 1.4, 2.25], [1.2, 1.2, 0.8], TONES.lit),
        ],
        glyphs: [{ kind: "link", from: [2, 2, 3.05], to: [2, 2, 4.4] }],
      };
    case "consistent":
      // Active on most days: an even streak of seven, today's lit as the streak carries on.
      return {
        boxes: [
          plinth(4.4, 2.2),
          ...Array.from({ length: 7 }, (_, i) =>
            block(
              [0.15 + i * 0.58, 0.55, 0],
              [0.42, 0.9, 1.1 + (i % 2) * 0.12],
              tower(i === 6 ? TONES.lit : TONES.mid),
            ),
          ),
        ],
        glyphs: [],
      };
    case "explorer":
      // Four or more languages: stepping stones rising, each its own green.
      return {
        boxes: [
          plinth(),
          block([0.1, 3.1, 0], [0.9, 0.9, 0.4], tower(TONES.faint)),
          block([1.1, 2.1, 0], [0.9, 0.9, 0.9], tower(TONES.low)),
          block([2.1, 1.1, 0], [0.9, 0.9, 1.4], tower(TONES.mid)),
          block([3.1, 0.1, 0], [0.9, 0.9, 1.9], TONES.lit),
        ],
        glyphs: [],
      };
    case "collaborator":
      // Reviews and pull requests elsewhere: two towers joined by a lit bridge.
      return {
        boxes: [
          plinth(5.2, 2.6),
          block([0.2, 0.6, 0], [1.3, 1.3, 2], tower(TONES.low)),
          block([3.3, 0.6, 0], [1.3, 1.3, 2], tower(TONES.low)),
          block([1.5, 0.95, 1.4], [1.8, 0.6, 0.25], TONES.lit),
        ],
        glyphs: [],
      };
    case "night-owl":
      // Commits after 22:00: a dark block of a city, a few lit roofs, the moon over it.
      return {
        boxes: [
          plinth(),
          block([0.3, 0.3, 0], [1, 1, 1.6], TONES.dark),
          block([1.6, 0.3, 0], [1, 1, 0.9], tower(TONES.mid)),
          block([2.9, 0.3, 0], [1, 1, 1.3], TONES.dark),
          block([0.3, 1.6, 0], [1, 1, 0.7], tower(TONES.low)),
          block([1.6, 1.6, 0], [1, 1, 1.9], tower(TONES.lit)),
          block([2.9, 1.6, 0], [1, 1, 0.8], TONES.dark),
          block([0.3, 2.9, 0], [1, 1, 1.1], TONES.dark),
          block([1.6, 2.9, 0], [1, 1, 0.6], TONES.dark),
          block([2.9, 2.9, 0], [1, 1, 1], tower(TONES.low)),
        ],
        glyphs: [{ kind: "moon", at: [0.6, 0.4, 3.6] }],
      };
    case "open-sourcer":
      // Three or more repositories you don't own: a hub wired to the projects around it. The
      // wires are thin lit slabs on the plinth, so they take part in the painting order.
      return {
        boxes: [
          plinth(),
          block([1.55, 1.55, 0], [1.1, 1.1, 1.2], TONES.lit),
          block([1.7, 0.05, 0], [0.8, 0.8, 0.8], tower(TONES.low)),
          block([3.35, 1.7, 0], [0.8, 0.8, 0.6], tower(TONES.mid)),
          block([1.7, 3.35, 0], [0.8, 0.8, 0.9], tower(TONES.faint)),
          block([0.05, 1.7, 0], [0.8, 0.8, 0.5], tower(TONES.low)),
          block([2.04, 0.85, 0], [0.12, 0.7, 0.03], TONES.lit),
          block([2.65, 2.04, 0], [0.7, 0.12, 0.03], TONES.lit),
          block([2.04, 2.65, 0], [0.12, 0.7, 0.03], TONES.lit),
          block([0.85, 2.04, 0], [0.7, 0.12, 0.03], TONES.lit),
        ],
        glyphs: [],
      };
  }
}

/** The letter: an envelope with a lit flap and seal, two sheets lifting out of it. */
export function letterScene(): Scene {
  return {
    boxes: [
      block([0.6, -0.4, 1.3], [3.2, 2.2, 0.05], TONES.dark),
      block([0.3, -0.1, 0.75], [3.2, 2.2, 0.05], TONES.dark),
      block([0, 0, 0], [4, 2.8, 0.35]),
      block([1.75, 1.1, 0.35], [0.5, 0.5, 0.12], TONES.lit),
    ],
    glyphs: [{ kind: "flap", at: [0, 0, 0.36], width: 4, depth: 2.8 }],
  };
}

/** Privacy: a vault with a lit keyhole, on a plinth, a small locked box in front of it. */
export function vaultScene(): Scene {
  return {
    boxes: [
      plinth(4.2, 5),
      block([0.4, 0.4, 0], [3, 3, 3]),
      block([0.5, 3.7, 0], [0.9, 0.9, 0.9], tower(TONES.low)),
    ],
    glyphs: [{ kind: "keyhole", at: [3.4, 1.9, 1.6] }],
  };
}
