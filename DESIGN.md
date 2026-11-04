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
