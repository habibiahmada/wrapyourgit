# Landing hero: an isometric contribution city

Date: 2026-11-11. Status: approved by the maintainer on 2026-11-11.

## Intent

The maintainer wants the front page to feel modern and minimal, with a striking isometric line-art illustration in the spirit of Nolana, Runlayer, Iconsax and GitHub's own homepage (references shared 2026-11-11). Today the hero shows Cell in front of a photo collage, with a strip of contribution cells along the bottom.

The new hero illustration is the product itself: the year's contribution graph drawn as the same isometric city the story opens on (one building per day, height from that day's count), in a quiet line-art style, with the busiest day lit and Cell standing on it.

This design covers the hero only. The other landing sections follow in their own design once this one is approved and built.

> **Grown while building (maintainer, 2026-11-11):** the full-year strip read as a thin line in the hero, and the maintainer asked to restyle every landing section. The hero became a quarter of the year on a slab with three linked blocks (languages, stars, letter); the full year moved to the closing section; every section's illustration is now isometric line art from shared primitives (`iso.ts`, `section-scenes.ts`); the hero copy was shortened. DESIGN.md records the result.

## Goals

1. The hero illustration is an isometric city drawn from `sampleRecap`, labelled as sample data.
2. Line-art look: dark faces, hairline edges, only active days filled with the contribution greens; the busiest day glows green and carries Cell.
3. Light: inline SVG rendered on the server, no WebGL, no client JavaScript for the drawing.
4. One entrance motion: buildings rise once, week by week, when motion is allowed.

## Non-goals

- The other landing sections, the dashboard, the story player, `/<username>`.
- New copy: the headline, paragraph, username form and sign-in actions stay as they are.
- New metrics or data: the illustration uses `sampleRecap` and the existing city geometry.

## Anti-goals

- Purple or blue gradients, a page-wide background grid, or glow on more than the one building (R-01, R-07, R-13).
- An illustration that covers or crowds the headline or form at any width (R-03).
- A heavy hero: a large DOM, layout shift when it loads, or the illustration delaying the headline (R-40).
- A sample number shown as if it were the visitor's (R-38).

## Approaches

| Approach                                                                                                                                         | Trade-off                                                                                                            | Picked                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **A. SVG drawn from the sample data with the existing city math** (`isoPoint`, `plotHeight`, `buildCity` in `packages/video/src/world/city.ts`). | Crisp at any size, light, matches the story; the line-art styling takes tuning.                                      | **Yes** (maintainer: "the lightest") |
| B. A rendered image of the story's city scene (WebP).                                                                                            | Quick, but static, soft on large screens, and must be re-rendered on every change.                                   | No                                   |
| C. A plus floating isometric "chapter modules" around the city (garden, night sky, letter).                                                      | Closest to the references, but the most work and the easiest to clutter. Can be added later if the hero feels empty. | No (for now)                         |

## Design

### Illustration

- **Data.** `buildCity(sampleRecap)`: 53 weeks by 7 weekdays, building height from `plotHeight`. Drawn on the server as one inline `<svg>` with a `viewBox` from `cityBounds`, so it scales with its box.
- **Style** (all from the web tokens in DESIGN.md):
  - Ground: each day's tile outlined with a `line` (`#30363d`) hairline, no fill: the calendar grid as the ground the city stands on. No grid anywhere else on the page.
  - Days with no contributions: flat tiles, outline only.
  - Active days: top face in the contribution green for that day's level (`#0e4429 #006d32 #26a641 #39d353`), side faces darker mixes of it, a hairline edge on every face.
  - The busiest day: the tallest building, `#39d353`, with the one glow on the page: a soft green radial light under and around it. Cell (the existing baked art, `<Art>`) stands on its roof.
- **DOM size.** Faces are merged into a few `<path>` elements per colour (one path holding every left face of one level, and so on), not one element per building, so the SVG stays a handful of nodes.
- **Accessibility.** The SVG is `role="img"` with an accessible name: "Illustration: a year of contributions drawn as a city, one building per day, from a sample recap." Cell's image is decorative there (`alt=""`). A small visible caption, "Sample year", sits under the illustration.

### Layout

- Desktop (`lg` and up): text and form on the left, the city on the right, the year's band running diagonally across the right half, cropped by the hero's edge where it leaves the frame.
- Narrower screens: the city below the actions, full width, cropped to its right part so buildings stay legible.
- The hero keeps `min-h-[90svh]`. The gradient background is replaced by plain `canvas` (`#0d1117`); the green glow is the only lighting.
- The bottom `CellField` strip is removed from the hero: the city is now the graph. The closing section keeps its strip, so the page still ends on the graph.

### Motion

- On first paint, buildings rise from their tiles week by week (a CSS animation with a per-week delay, about 1.2 s in total), then the glow fades in, then Cell rises. Once, never looping.
- `prefers-reduced-motion: reduce`: the finished city, no animation.
- The animation transforms the faces only, so nothing shifts the layout. The SVG box has a fixed aspect ratio from its `viewBox` (R-40).

### Code

- `apps/web/src/components/landing/hero-city.tsx`: a server component that builds the SVG from `sampleRecap`.
- The city helpers are imported from `@wyg/video` (add a `./city` export to `packages/video/package.json` if one is missing).
- `app/page.tsx`: the hero's `<Art id="hero-cast">` and `CellField` are replaced by `<HeroCity />`.
- DESIGN.md "Web": record the one green glow as the exception to "no gradients", and describe the hero city.

## Calls I made (the maintainer can override them)

- The whole year is drawn, not a few months: the shape of a full year is what makes it recognisable as a contribution graph.
- Ground tiles are the only grid, because they are the calendar.
- The hero CellField strip goes; the closing strip stays.

## Left to the builder

- Exact line widths, face shades, glow size and camera angle, tuned from screenshots at 375 px, 768 px and 1440 px and shown to the maintainer before merging.
- Cell's size and offset on the roof.
- Tests: the path builder (number of paths, active tiles filled, busiest building marked) and an accessibility check of the hero.
