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

Decided by the maintainer on 2026-11-04: the web pages should feel like GitHub ("GitHub-able"). The brand fields above (ink, paper, persimmon, cobalt) stay with the story, the video, the letter and the exports; the pages around them use a GitHub-dark set. Dark is the reason here, not a trend: it is the look of the product people are coming from (R-21).

| Token        | Hex       | Use                                | Contrast                    |
| ------------ | --------- | ---------------------------------- | --------------------------- |
| canvas       | `#0d1117` | page background                    |                             |
| header       | `#010409` | header, footer, alternate sections |                             |
| surface      | `#161b22` | boxes and cards                    |                             |
| overlay      | `#21262d` | buttons, comment headers, hover    |                             |
| line         | `#30363d` | hairline borders and dividers      |                             |
| fg           | `#e6edf3` | text                               | 16.0:1 on canvas            |
| muted        | `#8b949e` | secondary text                     | 6.2:1 canvas, 5.6:1 surface |
| green        | `#3fb950` | accent text and checks             | 7.5:1 on canvas             |
| green-button | `#238636` | the one primary button, white text | 4.63:1                      |
| blue         | `#4493f8` | links and the focus ring           | 6.1:1 on canvas             |

- Type is **Mona Sans** (GitHub's open-source face, `next/font`): headlines 700 with tight tracking, body 400.
- The contribution greens (`#0e4429 #006d32 #26a641 #39d353`, empty `#161b22`) are the one accent, used where they mean activity.
- Boxes are GitHub boxes: `surface`, 1px `line` border, 12px radius, dividers between rows. No hard shadows, no coloured full-bleed fields, no comic elements, no gradients.
- Focus is GitHub's: a 2px blue ring with 2px offset (ink inside the light letter).
- No scrollbars are drawn anywhere (the maintainer's call); scrolling itself is unchanged.

### Public pages

- **Structure follows the product, not a template.** The landing runs: hero, the nine chapters (a timeline bar whose segments are as wide as each chapter's share of the music, then real frames from a sample recap, labelled as sample data), archetypes (each with its rule from `metrics.md`), the letter (two real tier openings from `letter.ts`), what you keep (MP4 marked "Coming soon"), privacy facts, a product-specific FAQ, and a closing call to action. No statistics, logos or testimonials: there are none to show yet.
- **Backgrounds are the motif, not decoration.** A year of contribution cells (`CellField`, in GitHub's dark graph colours) runs along the bottom of the hero and the top of the closing section, so the page opens and closes on the same graph. On `/u/<login>` and the dashboard it is the owner's real calendar. Cells light up once, week by week, when motion is allowed.
- **Each section has its own composition** on alternating canvas and header-black bands: hero, the chapter strip and sample reel, archetype cards with the 3D skins, the letter as two GitHub-style comments with Cell standing beside them, unframed (no avatar circle), "what you keep" as a list box beside fanned slides (the one shadow, marking printed objects), privacy as a checklist box with Cell asleep, a FAQ box with a sticky heading, and the closing with Cell leaning in from the bottom edge.
- **Light by default.** No WebGL on public pages: the illustrations are baked PNGs through `next/image`, the cells are inline SVG. Scroll motion is CSS `animation-timeline: view()` with no JavaScript: elements fade and rise (or slide in from a side, or zoom) as they enter and fade out as they leave. Browsers without scroll timelines, and reduced motion, just show the content. `body` clips horizontal overflow so a sliding element never widens the page.
- **View transitions** (React `<ViewTransition>`, `components/site/page-transition.tsx`): every route change animates with the browser's View Transitions API. Links that go deeper (`nav-forward`) slide the new page in from the right, links back (`nav-back`) from the left, anything else crossfades with a small rise. Loading fallbacks leave downwards and the content rises in. The header carries `view-transition-name: site-header` and never moves. Story steps slide the same way (`story-next` / `story-prev`). Reduced motion sets every duration to 0; browsers without the API just swap.
- **The sample reel** drifts on its own to the end and back, loops, and can be dragged with a mouse or swiped. It stops while hovered, focused or held and resumes a moment after. Reduced motion never starts it. **R-39 override, recorded:** the maintainer asked for the visible Pause button to be removed; hover, focus, touch and reduced motion remain the ways to stop it.
- **Headline**: "Every green square has a story. Here's yours, in motion." The old "Your year in code" is retired because many similar products use it.
- **Navigation**: a solid ink sticky header (no blur) with links only to sections that exist, a disclosure menu on small screens that closes on Escape, and a skip link.

## Illustration (3D)

Chosen by the maintainer on 2026-11-04. Flat SVG and isometric SVG were judged too plain; a cel-shaded cartoon look with ink outlines and comic bursts was tried the same day and rejected ("like a kindergarten drawing"). Everything is glossy 3D.

- **One finish: soft vinyl.** Characters, costumes, animals and the world share a satin physical material with a thin clear coat and a little sheen (`three/toon.tsx`: `Toon`; its `Ink` is a no-op). Faces are lit too: glossy eyeballs and pupils (`Gloss`) with two unlit sparkles (`Sparkle`), opaque powdery blush (`Blush`) and a warm mouth (`MouthPaint`). The first glossy pass (2026-11-04) was rejected by the maintainer as cheap: faces were unlit stickers, arms floated beside the body and coloured lights tinted everything.
- **Studio light.** Cutouts, skins and the hero cast are lit by a neutral rig (`CutoutLights` in `World.tsx`): key, fill and rim lights plus an environment of softboxes, so glossy surfaces reflect real highlights. Colour comes from the objects, not the lights. Stills use Khronos PBR Neutral tone mapping so brand greens stay as picked.
- **Grounded, not staged.** A soft blob shadow (`BlobShadow`) sits under every cutout so characters stand. drei's `ContactShadows` renders inside `useFrame`, which Remotion stills never run, so it came out empty.
- **Cell**, the mascot, is a soft rounded contribution cell (large corner radius) with glossy cartoon eyes, brows, blush, arms in a darker shade of the body that grow from the shoulders, paper mitten hands with a thumb, and stubby legs into rounded shoes. Poses: idle, wave, cheer, proud, think and sleep.
- **A costume per archetype** (`three/outfits.tsx`): Builder wears a hard hat and tool belt with a hammer; Consistent a sweatband, a gold medal and persimmon shoes; Explorer a safari hat, a backpack and a rolled map; Collaborator a headset with a mic; Night owl a hood with owl tufts and round glasses; Open sourcer a propeller beanie.
- **A sidekick per archetype** (`three/animals.tsx`): beaver (builder, in its own hard hat), ant (consistent), fox (explorer), bee (collaborator), owl (night owl) and octopus (open sourcer).
- **Skins** (`three/skins.tsx`, `art/skin-<archetype>.png`) are the character-first illustrations: costumed Cell, the sidekick and one or two props, framed close so they read big. The **hero cast** (`art/hero-cast.png`) is Cell the builder with the beaver, the owl and the bee in front of a city. Neither has a stage or plinth: the maintainer asked for the cut-off base to go.
- **Backgrounds stay flat**: no gradients behind illustrations or in the story. Depth comes from the lit 3D objects. The one exception is the landing hero (canvas to surface, maintainer's call on 2026-11-04).
- **Code**: `packages/video/src/three` (React Three Fiber). Every motion is a function of `t` seconds: the render clock on the web, `frame / fps` in Remotion. Stills come from `bun scripts/render-art.ts` (angle-egl, post effects off).
- **Delivery on the web**: baked transparent PNGs through `next/image` on every public page and the dashboard, so no page needs WebGL to look finished. `Scene3D` (live WebGL over a poster) remains available but is no longer used by default.
- **Loading** (`components/loading-cell.tsx`): the 3D Cell thinking, with a week of cells in GitHub greens lighting up in turn. Used by the dashboard and story `loading.tsx` routes and every Suspense fallback.
- **Variety inside the story.** Each scene gets its own full-colour accent (`src/accents.tsx`): Cell waving on the intro, cheering on contributions, thinking on languages, the archetype skins on rhythm, projects and engineering, and the person's own skin at the climax. Each sits in the space its scene leaves empty, with a position per layout family, so it is large without covering a number. Faint silhouettes were tried and dropped: they ended up hidden behind the numbers.
- **Languages have faces**: Devicon logos (MIT, `public/lang`, see its LICENSES.md) on a paper sticker with an ink rim, so every logo reads on every field. Languages without a logo get their initials in the language's GitHub colour.
- **The letter** is stationery, not a slide: a paper sheet with a measure of about 62 characters, a dashed persimmon "stamp" holding Cell proud, and Cell waving from the side of the sheet on wide screens. The PNG/PDF version keeps the same text with the cutout in the top corner.

## Words

- **The letter** (`packages/video/src/letter.ts`) is encouragement first, numbers second: at most four figures, small counts written as words. Its tone follows an activity tier (blank, quiet, steady, busy, relentless) from the share of days with activity, so a quiet year is told it counts and a relentless year is told to rest. Phrasings are picked by a seed of login and year: different between people, stable for one person.
- **One archetype, plus runner-ups.** Each person gets one main archetype. Archetypes that also scored 0.55 or more (up to two) are named as "also part X and part Y" in the identity scene and the letter.
