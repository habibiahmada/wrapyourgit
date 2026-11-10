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
- Every cut has its own camera-like move, never repeated: dive into a cell, tilt, whip pan, iris, contribution-row blinds, card flip, a flash with camera shake for the archetype, and a pull-back into the closing (scene-system.md, Transitions).
- Everything that moves makes a sound (ADR-0009), quieter than the music: pops for things appearing, ticks while a number counts, a landing thump when it settles, climbing blips for bars and rows, a shimmer for graphs, an impact for the archetype. Groups get one sound, not one per item.
- After each count-up, the final number holds still for at least 1.5 s.
- Text and numbers stop once their beat is delivered. Characters don't: Cell (screen face made of light, stubby limbs on real joints) keeps moving on the beat in every view: waving, jumping, running, thinking, hammering, nodding, celebrating, as baked 3D loops (ADR-0013). Characters never cross a number or label.

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
- **Each section has its own composition** on alternating canvas and header-black bands: hero, the chapter strip and sample reel, archetype cards with each archetype's Cell in front of its photo, the letter as two GitHub-style comments with Cell standing beside them, unframed (no avatar circle), "what you keep" as a list box beside fanned slides (the one shadow, marking printed objects), privacy as a checklist box with Cell asleep, a FAQ box with a sticky heading, and the closing with Cell leaning in from the bottom edge.
- **Light by default.** No WebGL anywhere in the browser: the illustrations are baked 3D loops as animated WebP (`<Art>`, the still PNG under reduced motion), the cells are inline SVG. Scroll motion is CSS `animation-timeline: view()` with no JavaScript: elements fade and rise (or slide in from a side, or zoom) as they enter and fade out as they leave. Browsers without scroll timelines, and reduced motion, just show the content. `body` clips horizontal overflow so a sliding element never widens the page.
- **View transitions** (React `<ViewTransition>`, `components/site/page-transition.tsx`): every route change animates with the browser's View Transitions API. Links that go deeper (`nav-forward`) slide the new page in from the right, links back (`nav-back`) from the left, anything else crossfades with a small rise. Loading fallbacks leave downwards and the content rises in. The header carries `view-transition-name: site-header` and never moves. Story steps slide the same way (`story-next` / `story-prev`). Reduced motion sets every duration to 0; browsers without the API just swap.
- **The sample reel** drifts on its own to the end and back, loops, and can be dragged with a mouse or swiped. It stops while hovered, focused or held and resumes a moment after. Reduced motion never starts it. **R-39 override, recorded:** the maintainer asked for the visible Pause button to be removed; hover, focus, touch and reduced motion remain the ways to stop it.
- **Headline**: "Every green square has a story. Here's yours, in motion." The old "Your year in code" is retired because many similar products use it.
- **Navigation**: one `SiteHeader` for every page (`components/site/site-header.tsx`): a solid ink sticky header (no blur), the six-cell `LogoMark`, a skip link, then either the section links with Sign in / Your dashboard (`variant="public"`) or the account (avatar to the dashboard, Settings, Sign out; `variant="app"`). Small screens get a disclosure menu that closes on Escape; on the narrowest phones the edition badge hides so the account buttons fit.
- **Icons**: the favicon (`app/icon.svg`, `favicon.ico`), the Apple touch icon and the PWA icons are the same six-cell mark as the header, on the canvas colour.

## Illustration (3D)

Chosen by the maintainer on 2026-11-04. Flat SVG and isometric SVG were judged too plain; a cel-shaded cartoon look with ink outlines and comic bursts was tried the same day and rejected ("like a kindergarten drawing"). Everything is glossy 3D.

- **One finish: matte vinyl.** Characters, their gear and the world share a diffuse physical material: high roughness, almost no clear coat, muted environment reflections and a faint seeded grain as a bump map (`three/toon.tsx`: `Toon`; its `Ink` is a no-op). Faces are screens made of light (`Glow`) on a dark panel. Rejected on 2026-11-04, in order: cel shading, lacquer with unlit sticker faces, and a clear-coated vinyl that "looks like glass". The target is a real toy photographed in a studio: light scatters, it does not mirror.
- **Studio light.** Cutouts, skins and the hero are lit by a neutral rig (`CutoutLights` in `World.tsx`): key, fill and rim lights plus an environment of softboxes, so glossy surfaces reflect real highlights. Colour comes from the objects, not the lights. Stills use Khronos PBR Neutral tone mapping so brand greens stay as picked.
- **Grounded, not staged.** A soft blob shadow (`BlobShadow`) sits under every cutout so characters stand. drei's `ContactShadows` renders inside `useFrame`, which Remotion stills never run, so it came out empty.
- **Cell**, the mascot, is a chibi toy since 2026-11-05 (ADR-0010): a big rounded head with a dark screen face whose eyes are made of green light, a small body with a lighter belly, stubby arms and legs with real joints, and a sprout on top. The old cube-bodied Cell is retired everywhere: story, pages, exports and docs.
- **One mascot, one rig** (`three/ChibiCell.tsx`, `three/pose.ts`, `src/cast.ts`, ADR-0012): Cell is in every chapter, never a different character. Each chapter gives it its own motion on the 120 BPM beat (`chibiPose`), its own gear and its own place, so the story varies without changing mascot.
- **Each archetype has its own Cell** (`archetypeRole`, `ARCHETYPE_COLORS` in `cast.ts`): its own body colour, pose and place. Builder orange, hard hat, hammering in a workshop; Consistent green, sweatband, running on a track; Explorer sky blue, cap and backpack, waving from the mountains; Collaborator pink, headset, handing work on over a shared map; Night owl lavender, owl tufts and glasses, grooving over a city at night; Open sourcer teal, scarf, cheering by a community mural. No animal sidekicks.
- **Photos only in the baked web art** (`PhotoCard`, `src/photos.ts`): the archetype skins and the landing hero put Cell in front of a public-domain photo with a paper border and a slight tilt. Only CC0 or Public Domain Mark photos; credits in `packages/video/public/photos/CREDITS.md`. The story keeps Cell on the field with no backdrop. The 3D cities, moon and floating cubes are gone: they looked worse than the character.
- **In the story, Cell lives in the city.** Each stop is its own scene on a day of the year (`packages/video/src/world/scenes`, [scene-system.md](docs/video/scene-system.md#stops)), and Cell appears where that scene puts it.
- **Baked loops** (`three/ArtStill.tsx`, `src/art.ts`, `bun scripts/render-art.ts`, ADR-0013) draw the same rig and looks as two-second loops: animated WebP for pages, and a still PNG of each at the motion's peak, which is what the story world draws: `cutout-cell-*` (Cell waving, cheering, thinking, proud with a crown, asleep), `cutout-<archetype>` (the archetype's Cell alone) and `skin-<archetype>` (the same Cell in front of the archetype's photo), and `hero-cast` (Cell waving in front of three fanned photos: workshop, fireworks, mountains). `head-cell` is Cell's head alone, for the letterhead. Page art is turned three-quarters so arms and legs read beside the big head. No stage or plinth.
- **Backgrounds stay flat**: no gradients behind illustrations or in the story. Depth comes from the lit 3D objects. The one exception is the landing hero (canvas to surface, maintainer's call on 2026-11-04).
- **Code**: `packages/video/src/three` (React Three Fiber). Every motion is a function of `t` seconds: the render clock on the web, `frame / fps` in Remotion.
- **Delivery on the web**: the story world draws the baked still PNGs; every other page shows animated WebP; nothing needs WebGL. **Exports** (MP4, PNG, ZIP, PDF) are rendered from the story composition itself in the viewer's browser, so they match the story exactly (ADR-0016).
- **Loading** (`components/loading-cell.tsx`): the chibi Cell thinking, with a week of cells in GitHub greens lighting up in turn. Used by the dashboard and story `loading.tsx` routes and every Suspense fallback.
- **Variety inside the story.** Each chapter has its own motion and gear for Cell, or its silhouette (`src/cast.ts`), placed in the space its scene leaves empty with a position per layout family, so it is large without covering a number.
- **Languages have faces**: Devicon logos (MIT, `public/lang`, see its LICENSES.md) on a paper sticker with an ink rim, so every logo reads on every field. Languages without a logo get their initials in the language's GitHub colour.
- **The letter** is stationery, not a slide (`packages/video/src/world/scenes/Letter.tsx`, one stop per page, so each page is also a slide): a letterhead with only Cell's head (`head-cell`), the sender and a persimmon postmark; the person's own last 53 days of contributions as the rule under it; the paper carries a faint motif of cells in the margins and a branch graph along the foot; the sign-off ends with a row of lit cells. A measure of about 62 characters.

## Words

- **The letter** (`packages/video/src/letter.ts`) is encouragement first, numbers second: at most four figures, small counts written as words. Its tone follows an activity tier (blank, quiet, steady, busy, relentless) from the share of days with activity, so a quiet year is told it counts and a relentless year is told to rest. Phrasings are picked by a seed of login and year: different between people, stable for one person.
- **One archetype, plus runner-ups.** Each person gets one main archetype. Archetypes that also scored 0.55 or more (up to two) are named as "also part X and part Y" in the identity scene and the letter.
