# 0010. The story's cast is live 3D, rendered every frame

- Status: Accepted; point 3 superseded by [0012](0012-one-mascot-photo-backdrops.md)
- Date: 2026-11-05

## Context

The scenes used baked PNG cutouts of Cell and its friends. A PNG can only move as a whole (slide, bob, squash), and the maintainer wanted characters whose arms, legs, heads and faces move, in a softer chibi style (big screen-faced head, small body, stubby limbs), with a different character in each scene.

## Decision

1. **One rig, many characters.** `packages/video/src/three/ChibiCell.tsx` draws a chibi toy with joints at the neck, shoulders and hips. A `Look` (`three/pose.ts`) sets who it is: body colour, head shape (`squircle`, `wide`, `tall`, `round`, `cube`), eyes made of light on a dark face panel (`cells`, `dots`, `happy`, `visor`, `sleepy`), what sits on top (`sprout`, `antennas`, `ball`, `tufts`) and gear (headset, hard hat, glasses, sweatband, scarf, backpack, crown, cap, hammer).
2. **Motion is a pure function.** `chibiPose(motion, t, seed)` returns every joint angle for a time; ten motions (wave, cheer, run, think, hammer, pass, groove, celebrate, proud, sleep), all on the 120 BPM beat. A frame always renders the same pose (ADR-0002).
3. **A cast, not a mascot.** _(Superseded by ADR-0012: Cell hosts every scene.)_ `src/cast.ts` gives each scene its own character and motion, coloured against that scene's field; Cell hosts the intro, wears the person's archetype and closes. `cast.test.ts` keeps the guests and motions distinct.
4. **Rendered live** by `LiveAccent` (a `ThreeCanvas` placed like the old cutouts), on the web Player and on Lambda alike.
5. **Lambda renders WebGL on the CPU** (`chromiumOptions.gl: "swangle"`), one tab per function.

## Alternatives

- **Bake each motion to a sprite sheet** (render once, play frames): light at render time and identical output, but megabytes of images per character, and every new character or motion needs a re-bake. Offered as the default; the maintainer chose live rendering.
- **Keep the PNGs with whole-image idle motion:** rejected by the maintainer: the picture moved, the character did not.

## Consequences

- Each frame draws one WebGL canvas per character group, two during a transition (the frozen previous scene and the new one). Render time per frame goes up; measure Lambda cost before launch.
- **Parallel tabs on one machine contend for WebGL.** Locally, default concurrency timed out at the first transition; `--concurrency=2` (or 1) renders cleanly. Lambda uses one tab per function, which matches the passing case.
- The web Player now runs WebGL during chapters; check frame rate on mid-range phones.
- The baked art (`public/art/*.png`) stays for the web pages, loading states and the OG image, re-baked from this rig (2026-11-05) so every page shows the same mascot. Exports render frames of the composition instead (ADR-0011).
