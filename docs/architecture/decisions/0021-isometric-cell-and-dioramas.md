# 0021. Cell and the landing art in crisp isometric 3D

- Status: Accepted
- Date: 2026-11-11
- Supersedes: [0012](0012-one-mascot-photo-backdrops.md) (photo backdrops), and the look of Cell in [0010](0010-live-3d-cast.md) (the rig's joints and motions stay)
- Amends: [0013](0013-baked-animation-no-webgl.md) (same bake, new picture)

## Context

The landing moved to isometric art (#80, #81) after the maintainer shared references (Nolana, Runlayer, Iconsax, GitHub's homepage). The section dioramas were flat SVG boxes and read as "long boxes stacked in colours". A rounded toy-style 3D pass was rejected too: the maintainer wanted the characters themselves in the references' isometric style, and found Cell weak in four ways at once: the boxy head with a screen face, its proportions, its plastic material, and no signature.

## Decision

1. **One style for every picture of Cell and the landing art:** crisp isometric 3D. An orthographic camera 30 degrees up and 45 degrees round (the 2:1 look of the hero's SVG); every box face is one flat, unlit colour by the way it faces (top lightest, the face toward the viewer's left mid, the right darkest) with a hairline edge; green contribution light marks what matters (`three/diorama/isokit.tsx`).
2. **Cell is a contribution cell** (`three/diorama/IsoCell.tsx`): one block for body and head, pixel eyes with a glint and bar brows on its front (no screen panel), prism limbs on real joints driven by the existing motions (`three/pose.ts`), and a crest of three small cells, darkest to brightest, as its signature. Archetypes dress it in blocky gear (hard hat and hammer, sweatband, cap and backpack, headset, glasses, owl tufts, scarf, crown) and their body colour (`ARCHETYPE_COLORS`).
3. **Archetype art is a diorama with company** (`three/diorama/scenes.tsx`): `skin-<archetype>` is now the place its rule happens, busy but tidy, with a companion (beaver, dog, fox, a teammate, an owl, friends from other projects). The landing adds `iso-letter`, `iso-privacy` and `iso-closing` (the whole sample year as a city).
4. **Same ids, same bake.** Every existing art id keeps its name, so the pages, the share card and the story world pick up the new look by re-baking (`bun scripts/render-art.ts`). Photos leave the baked art; the old rig (`ChibiCell`, `toon`, `World`, `BlobShadow`, `PhotoCard`) is removed.
5. **The bake runs anywhere:** ImageMagick assembles the WebP when `ffmpeg` (with `libwebp_anim`) is missing, and `REMOTION_BROWSER_EXECUTABLE` reuses an installed headless Chrome instead of downloading one.

## Alternatives

- **Detailed flat SVG:** light, but it stays flat and boxy; the first SVG pass was exactly what was rejected.
- **Rounded toy 3D (soft vinyl, gummy Cell, a hoodie kid):** shown as a spike on 2026-11-11 and rejected: it did not match the isometric references.
- **Live WebGL:** ruled out by ADR-0013.

## Consequences

- Flat unlit colours mean scenes need no lights and render the same everywhere; depth and shading come from the face colours.
- Weight is about the same as before: a page loop is a few hundred KB, lazy-loaded below the fold.
- A new scene or gear piece means a re-bake of the ids it touches.
