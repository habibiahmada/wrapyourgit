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
- The story is one train ride ([ADR-0023](docs/architecture/decisions/0023-the-story-is-a-train-ride.md)). The camera glides once per move, from one station's side to the next, never turning back and forth. The train pulls away, cruises and pulls in.
- Nothing appears or disappears on the spot. A station's hero is lowered in as the train comes in and is finished when it stops; it stays standing until it is out of the frame. Signs never move.
- A station is alive at rest: smoke, Cell blinking, the station's own small loop, every cycle two seconds long so the rest loops without a seam.
- Everything that moves makes a sound (ADR-0009), quieter than the music: the wheels on the rails for every move, and an arrival sound at each stop.
- Numbers count up while their hero builds and are exact when the train stops; a stop holds at least three seconds in a video.
- Characters never cross a number or label.

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
- Boxes are GitHub boxes: `surface`, 1px `line` border, 12px radius, dividers between rows. **Glass is for what stands in front of an isometric room** (maintainer's call, 2026-11-12): the archetype cards and the privacy cards, which sit over an `IsoBackdrop`, and the hero's three callouts over its city, are `glass-card` / `glass-pill` (a near-opaque dark base, `backdrop-filter: blur(16px)`, a lit top edge and a soft drop), because there is something to see through them. A card on a plain band stays a solid box: glass over nothing only costs the GPU. The page has two glows and no more: the green under the hero's busiest day and the one behind the closing city.
- Focus is GitHub's: a 2px blue ring with 2px offset (ink inside the light letter).
- No scrollbars are drawn anywhere (the maintainer's call); scrolling itself is unchanged.

### Public pages

- **Structure follows the product, not a template.** A section holds one to three things, so nothing crowds a single band. The landing runs: hero (with three callouts from the sample recap, labelled as sample data); the story in three acts (one box, a column to an act, each with a real frame of the story and its stops numbered in running order); the sample reel (twelve real frames, with a visible Pause button); three measures with their definitions in plain words (the calendar largest, then languages and the year comparison, linked to `metrics.md`); archetypes in two rows of three by what earns them (each with its rule from `metrics.md` and its `skin-*` block); the letter (three tier openings from `letter.ts` beside the post office's block); watching and the video (three facts under the video's four shapes); what else you keep (three rows beside three real slides laid flat); three privacy promises beside the vault's block; a FAQ in two groups with Cell thinking; and a closing call to action over the whole year's city. No invented statistics, logos or testimonials.
- **Isometric art, drawn from the product, and reaching the walls.** Everything is in the story city's 2:1 isometric projection (`components/landing/iso.ts`). The hero is inline SVG: a quarter of a sample year as a city on a thick slab, its busiest day lit with Cell on the roof and a green glow beneath it, linked by dashed lines to three small blocks (languages, stars, the letter), with the lines of a room's two back walls behind it. Windows are lit on the towers that show a face, and streets with cars, trees and lamps run round the quarter's two near sides (ADR-0022). Three bands in the header's black (archetypes, privacy, closing) stand in a room of their own (`IsoBackdrop` in `iso-backdrop.tsx`): floor lines at `atan(0.5)`, two back walls with upright lines, a few points where lines meet and dashed traces, faded toward the band's edges and kept quiet (no halos) so text over them stays easy to read. Its corner can be moved across the band to keep its upright off a heading. Small subjects are server-drawn SVG clusters on a slab with two wall ledges (`MiniIsoCluster`: the calendar, languages, the year comparison, the video's four shapes); the big ones are baked dioramas (`skin-*`, `iso-*`, ADR-0021).
- **Each section has its own composition** on alternating canvas and header-black bands: the hero scene; the three acts as one divided box; the reel as a strip; the measures as one large card and two small; the archetype rows over a room; the letter beside three GitHub-style comments stepping to the right; the video's facts as one divided box under its screens; the prints as a list beside slides laid flat; the privacy cards over a room; the FAQ with a sticky heading; and the closing over a room with the page's second glow.
- **Light by default.** No WebGL anywhere in the browser: the illustrations are baked 3D loops as animated WebP (`<Art>`, the still PNG under reduced motion; a city block is a still with a loop of Cell laid over it, ADR-0022), and the rooms and clusters are server-rendered inline SVG. Scroll motion is CSS `animation-timeline: view()` with no JavaScript: elements fade and rise, slide in from a side, zoom, float up (`reveal-float`) or tilt up (`reveal-tilt`) as they enter, and fade out as they leave. Nothing is blurred on the way: text that is entering has to stay readable, and a filter on a large moving element is the costly part. Browsers without scroll timelines, and reduced motion, just show the content. `body` clips horizontal overflow so a sliding element never widens the page.
- **View transitions** (React `<ViewTransition>`, `components/site/page-transition.tsx`): every route change animates with the browser's View Transitions API. Links that go deeper (`nav-forward`) slide the new page in from the right, links back (`nav-back`) from the left, anything else crossfades with a small rise. Loading fallbacks leave downwards and the content rises in. The header carries `view-transition-name: site-header` and never moves. Story steps slide the same way (`story-next` / `story-prev`). Reduced motion sets every duration to 0; browsers without the API just swap.
- **The sample reel** drifts on its own to the end and back, loops, and can be dragged with a mouse or swiped. It has a visible Pause button (R-39; the maintainer's earlier call to remove it was reversed on 2026-11-12), and also stops while hovered, focused or held, resuming a moment after. Reduced motion never starts it. Its frames are stills of the story ride from the public sample (`scripts/ride-stills.ts --fixture public-sample --format 4x5`), as are the three acts' pictures (16:9). They are imported (`components/landing/frames.ts`), so each has an address named from its contents: rendering a frame again can never leave the old picture in a cache.
- **Headline**: "Every green square has a story." (two lines on desktop, with a two-sentence lead). The longer "Here's yours, in motion." was dropped on 2026-11-11: the maintainer found the large, long hero text hard on the eye. "Your year in code" stays retired. **The page speaks to "you"** (maintainer's call, 2026-11-12): the lead says "Type your GitHub username", the field's button is "Play your year", and a signed-in visitor's button is the short "Open your recap" with no username in it. Where the name may be someone else's (the retry field on a recap that could not be shown) the button is the neutral "Open the recap".
- **Navigation**: one `SiteHeader` for every page (`components/site/site-header.tsx`): a solid ink sticky header (no blur), the six-cell `LogoMark`, a skip link, GitHub's mark linked to the repository (the project is open source; hidden on a phone in the app header, where the account's buttons need the room), then either the section links with Sign in / Your dashboard (`variant="public"`) or the account (avatar to the dashboard, Settings, Sign out; `variant="app"`). Small screens get a disclosure menu that closes on Escape; on the narrowest phones the edition badge hides so the account buttons fit.
- **Icons**: the favicon (`app/icon.svg`, `favicon.ico`), the Apple touch icon and the PWA icons are the same six-cell mark as the header, on the canvas colour.

## Illustration (3D)

Chosen by the maintainer on 2026-11-11 ([ADR-0021](docs/architecture/decisions/0021-isometric-cell-and-dioramas.md)), after the isometric references (Nolana, Runlayer, Iconsax, GitHub's homepage). Earlier looks, all retired: glossy toy 3D, cel shading, matte vinyl with a screen-faced chibi, flat SVG boxes, and a rounded "gummy" spike.

- **Crisp isometric 3D.** An orthographic camera 30 degrees up and 45 degrees round, the same 2:1 look as the landing hero's SVG. Every box face is one flat, unlit colour by the way it faces: top lightest, the face toward the viewer's left mid, the right darkest, with a hairline edge (`three/diorama/isokit.tsx`). Green contribution light (screens, rims, crests) marks what matters. No lighting rig, no gradients.
- **Cell is a contribution cell** (`three/diorama/IsoCell.tsx`): one block for body and head, pixel eyes with a white glint and bar brows on its front, prism arms and legs on real joints, and a crest of three small cells from dark to bright green, its signature. Motions come from `three/pose.ts` and loop in two seconds.
- **Each archetype has its own Cell** (`archetypeRole`, `ARCHETYPE_COLORS` in `cast.ts`): body colour and blocky gear. Builder orange, hard hat and hammer; Consistent green, sweatband; Explorer sky blue, cap and backpack; Collaborator pink, headset; Night owl lavender, owl tufts and glasses; Open sourcer teal, scarf.
- **City blocks and dioramas** (`three/diorama/scenes.tsx`, `three/diorama/city.tsx`, [ADR-0022](docs/architecture/decisions/0022-archetype-art-is-a-city-block.md)): each archetype's `skin-*` is a dense city block with Cell, large, on a plaza in its middle, turned to the camera: a building site under a crane; a running track with a podium and a clock tower; a mountain, a lake and a camp; an office campus with a courtyard of tables; a block late at night with the owl on a roof; a town square with a stage, a market and a fountain. The things of its rule float round Cell, never in front of it. The landing adds three rooms: the letter (a writing desk, a post box, a carrier bird), privacy (a vault, a server rack, a sleeping cat) and the close (the whole sample year as a city, Cell crowned on a stage, fireworks).
- **Baked loops** (`three/ArtStill.tsx`, `three/diorama/DioramaStill.tsx`, `bun scripts/render-art.ts`, ADR-0013): animated WebP for pages and a still PNG at each motion's peak for reduced motion and the share card; the archetype station plays its city block's loop frame by frame. City blocks (`skin-*`, `iso-*`) are baked in two layers, `<id>-base.webp` and a loop of Cell alone. Ids: `cutout-cell-*`, `cutout-<archetype>`, `skin-<archetype>`, `hero-cast`, `head-cell`, `iso-letter`, `iso-privacy`, `iso-closing`. The bake falls back to ImageMagick without ffmpeg and can reuse a local headless Chrome (`REMOTION_BROWSER_EXECUTABLE`).

## Words

- **The letter** (`packages/video/src/letter.ts`) is encouragement first, numbers second: at most four figures, small counts written as words. Its tone follows an activity tier (blank, quiet, steady, busy, relentless) from the share of days with activity, so a quiet year is told it counts and a relentless year is told to rest. Phrasings are picked by a seed of login and year: different between people, stable for one person.
- **One archetype, plus runner-ups.** Each person gets one main archetype. Archetypes that also scored 0.55 or more (up to two) are named as "also part X and part Y" in the identity scene and the letter.
