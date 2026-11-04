# DESIGN.md

Design direction for the story and video (`packages/video`). Chosen by the maintainer on 2026-11-04 for Spike B. The full design system lands in M4; change this file first when the direction changes.

Dial: ENERGY 3 / RHYTHM 3 / MOTION 3

## Identity

- **Mood: kinetic poster.** Every scene is one flat field of color with oversized type. Hard cuts on the beat. The number is the hero of each scene.
- **Motif: the contribution cell.** The small square of the GitHub contribution graph is the visual unit. Scene transitions are made of cells, numbers build out of cells, and the one accent is a lit cell. It ties every frame back to the user's own graph.
- **Voice:** short, direct and in the second person ("Your year in code."). No buzzwords, and no number without a source in `RecapData`.

## Palette

Neutrals plus two field colors and one accent (R-29). Contrast was measured with the antislop contrast checker. Only the text pairings listed here are allowed.

| Token       | Hex       | Role                                           | Text on it                                         |
| ----------- | --------- | ---------------------------------------------- | -------------------------------------------------- |
| `ink`       | `#14130F` | Neutral field and text                         | paper 16.20:1, cell green 9.40:1                   |
| `paper`     | `#F4EFE3` | Neutral field and text                         | ink 16.20:1, `inkSoft` 6.18:1                      |
| `inkSoft`   | `#5C584E` | Secondary text on paper only                   | n/a                                                |
| `persimmon` | `#E4572E` | Field                                          | **ink only** (5.05:1); paper fails (3.21:1)        |
| `cobalt`    | `#2B39C8` | Field                                          | **paper only** (7.26:1); green text fails (4.21:1) |
| `cell`      | `#39D353` | The accent: lit cells, one highlight per scene | ink on it 9.40:1. As text, only on ink             |

Heatmap levels reuse GitHub's own green ramp (`#9BE9A8`, `#40C463`, `#30A14E`, `#216E39`), so the graph reads like the user's profile. These greens appear only as cells and never as text.

Why these colors: the green is the color of the user's own contribution graph, so the accent carries meaning, not decoration. Persimmon and cobalt are warm and cool poster inks that sit far from that green, so a lit cell always stands out against them.

## Typography

- **Bricolage Grotesque** (Google Fonts, weights 400/700/800) for everything. It has visible quirks in letters like `a`, `g` and `y`, so a personal recap reads as personal instead of corporate. Numbers use `tabular-nums` so count-ups don't jitter.
- Display numbers are set at 800 weight, labels at 700. Letter-spacing stays normal, and uppercase is used only for one short label per scene.

## Layout

- Sizes come from `useVideoConfig()` and are never fixed px. The base unit is `min(width, height) / 100`.
- Scenes branch on layout family (`portrait` / `compact` / `landscape`). Portrait keeps all text inside the central 80% of the height.
- RHYTHM 3: no two consecutive scenes share a composition. The number can sit top-left, centered, bottom-right, or beside a graphic.

## Motion

- Everything is frame-driven (`interpolate`, `spring`, `random(seed)`).
- Cuts and the start of each count-up land on beats of the track. Scene lengths are whole beats.
- A cell wipe opens every scene: the previous scene's color breaks into cells that fall away in a seeded order.
- After each count-up, the final number holds still for at least 1.5 s.
- No endless loops. Motion stops once the scene's beat is delivered.

## Web (landing, dashboard, story page)

Dial for web chrome: ENERGY 3 / RHYTHM 2 / MOTION 1. The story player is where the motion lives, so the pages around it use hover and focus states only and never compete with it.

- Pages use the same fields as the video. The landing opens on ink, the dashboard sits on paper, and calls to action use persimmon with ink text (5.05:1). Because every surface is a brand field shared with the exported video, there is no separate light/dark theme. A toggle would break the match between the page and the video people share.
- Type is Bricolage Grotesque (`next/font`), with the same weights as the video. Headlines are 800, and body text is 400 at 16px or more.
- The motif shows up in a single place per page, as a row of lit contribution cells beside the main number. Cells are never used as bullets or decoration elsewhere.
- Radius is 6px on buttons and cards and 4px on cells, with no pills. There are no shadows, because fields are flat.
- Focus is a 3px ink outline offset by 3px (paper on ink fields), which gives at least 3:1 on every field.

## Illustration (3D)

Chosen by the maintainer on 2026-11-04, after flat SVG and isometric SVG were judged too plain.

- **Cell**, the mascot, is a rounded 3D contribution cell with a sculpted face (eyes, cheeks, mouth, arms and feet as geometry, no textures). Poses: idle, wave, cheer, proud (crown of cells), think and sleep. Friends in group scenes use heat-ramp body colours.
- **One diorama per archetype**, built from the same parts. Builder has a crane placing a cell on a contribution city. Consistent has seven steps rising day by day. Explorer has floating islands, a flag and a telescope. Collaborator has two Cells passing a block. Night owl has a moon, a desk, a glowing laptop and a lamp. Open sourcer has Cell handing blocks to friends.
- **Stage and background are flat and solid**: an ink background and an unlit stage with one glowing green rim. There is no gradient backdrop; the maintainer rejected a lit cove as "slop". Colour and volume come from the lit objects only.
- **Light**: a warm key light with shadows, a cobalt rim, a persimmon kicker and a spotlight on the objects, plus contact shadows to ground them. Bloom only affects emissive things (the stage rim, the busiest cells, the moon, screens), plus a light vignette. No depth of field, because it blurred Cell.
- **Code**: `packages/video/src/three` (React Three Fiber). Every motion is a function of `t` seconds: the render clock on the web, `frame / fps` in Remotion.
- **Delivery on the web**: `Scene3D` shows the baked PNG (`packages/video/public/art`, symlinked into `apps/web/public/art`, made by `bun scripts/render-art.ts`) first, then lazy-loads the live scene when it is visible. Reduced motion or no WebGL keeps the still. Small screens skip post effects. One WebGL canvas per view: browsers run out of contexts after a few.
- **Loading** uses the baked "Cell thinking" image with a gentle motion-safe bob, never WebGL.
- **Variety inside the story.** The full diorama appears once (landing, dashboard, public page), not in every chapter. Inside the story each scene gets its own _accent_: a baked transparent cutout (`cutout-*.png`, Cell in one pose or an archetype prop set without its stage) placed differently per scene. Some peek in from an edge, some sit in a corner, and some are a faint silhouette behind the text (ink at 7-8% on light fields, paper at 8% on ink). The table lives in `docs/video/scene-system.md`. Accents always sit behind the text and never cover a number.
- **The letter** is stationery, not a slide: a paper sheet with a measure of about 62 characters, a dashed persimmon "stamp" holding Cell proud, and Cell waving from the side of the sheet on wide screens. The PNG/PDF version keeps the same text with the cutout in the top corner.

## Words

- **The letter** (`packages/video/src/letter.ts`) is encouragement first, numbers second: at most four figures, small counts written as words. Its tone follows an activity tier (blank, quiet, steady, busy, relentless) from the share of days with activity, so a quiet year is told it counts and a relentless year is told to rest. Phrasings are picked by a seed of login and year: different between people, stable for one person.
- **One archetype, plus runner-ups.** Each person gets one main archetype. Archetypes that also scored 0.55 or more (up to two) are named as "also part X and part Y" in the identity scene and the letter.
