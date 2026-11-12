# 0022. An archetype's picture is a dense city block with Cell in its middle

- Status: Accepted
- Date: 2026-11-12
- Amends: [0021](0021-isometric-cell-and-dioramas.md) decision 3 (archetype art is a diorama with company)

## Context

ADR-0021 made each archetype's `skin-*` a room or a field with Cell and a companion in it. In the story ride's archetype station (#88) that picture was the least visible thing at the stop: a dark room with a small Cell, on a dark plaza. The maintainer asked for the picture to carry the station, for Cell to face the camera and move, for the things of the archetype to float round it without ever covering it, and then for far more detail, with four references: dense isometric city maps (Gainy's map for investors, Cork Chamber's infographic, two blue line-art cities), where richness comes from many small repeated parts: windows, cars, trees, lane marks.

One sample (Builder) was built at that level and shown before the rest. The maintainer approved it for all archetypes.

## Decision

1. **Each archetype's `skin-*` is a city block** on an island with a lit rim (`three/diorama/scenes.tsx`, `Block`):
   - Cell, large, in the archetype's look on a plaza in the middle, turned toward the camera and doing its motion;
   - two roads that meet at the near corner, with crossings, traffic, street trees and lamps;
   - the district of its rule behind and beside the plaza, with small Cells in it.

   | Archetype    | District                                                                                |
   | ------------ | --------------------------------------------------------------------------------------- |
   | Builder      | a building going up under a crane and scaffolding, a site office, pallets of bricks     |
   | Consistent   | a running track with runners, a podium, the week on a board, a clock tower              |
   | Explorer     | a mountain with snow, a lake, tents and a fire, a lighthouse, a tower for each language |
   | Collaborator | two towers joined by a bridge, a café, a courtyard of tables and a team, a bus stop     |
   | Night Owl    | towers lit late, a sign in lights, the owl on a roof, someone at a screen on a terrace  |
   | Open Sourcer | a stage and a crowd, market stalls under bunting, a fountain, a globe, a depot          |

2. **The parts come from one kit** (`three/diorama/city.tsx`): towers with rows of windows, roads, cars and a bus, trees, lamps, a crane, scaffolding, stalls, a mountain, a lake and so on. All are boxes and flat panes in ADR-0021's style. A part's variety comes from a `seed`, never from chance, so every bake is the same picture.
3. **Nothing floats in front of Cell.** Floating things are placed by where they are seen on screen (`seenAt`), outside the part of the picture Cell fills, and the confetti leaves that part out.
4. **The bake also writes every frame** of a `skin-*` loop to `art/<id>/NN.webp` (`scripts/render-art.ts`). The story ride's archetype station plays them on its canvas, two ride frames to each, so the figure moves there too.
5. **The ride's archetype station shows no reasons.** It prints the intro and the title on a board that stands behind the block (over its roofs in a narrow frame, beside its towers in a wide one), so nothing stands in front of the picture; the picture carries the stop. The reasons stay in the data (`identity.reasons`).

The landing's `iso-letter`, `iso-privacy` and `iso-closing` keep their rooms from ADR-0021.

## Consequences

- The landing's archetype cards, the dashboard, the privacy page and the installation prompt show the new pictures: they all read `skin-<archetype>`.
- The cut-outs (`cutout-*`) are unchanged. They still show the stepped crest of ADR-0021, while the ride's live Cell wears three cells of one height.
- A block is about 900 boxes and panes. That costs bake time only (about 47 s for one loop); nothing in the browser draws it live.
- Six loops of 30 frames add about 180 WebP files to `public/art`.
- At the ride's station the block is wider than its stage, so the camera stands further back than at other stops.
