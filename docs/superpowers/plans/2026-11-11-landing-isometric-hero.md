# Landing isometric hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the landing hero's photo collage and cell strip with an isometric line-art contribution city drawn from the sample recap, the busiest day lit green with Cell on its roof.

**Architecture:** A pure function turns `buildCity(sampleRecap)` into a few SVG path strings grouped by colour; a server component renders them as one inline `<svg>` with Cell's baked art positioned over the busiest roof; CSS animates the entrance.

**Tech Stack:** Next.js 16 server components, inline SVG, Tailwind CSS 4, `bun test`.

**Spec:** [docs/superpowers/specs/2026-11-11-landing-isometric-hero-design.md](../specs/2026-11-11-landing-isometric-hero-design.md)

## Global Constraints

- Web tokens only (DESIGN.md "Web"): canvas `#0d1117`, line `#30363d`, greens `#0e4429 #006d32 #26a641 #39d353`. No purple or blue, no gradient except the one green glow.
- Inline SVG on the server; no WebGL, no client JavaScript for the drawing.
- One entrance animation, once; none under `prefers-reduced-motion: reduce`.
- The SVG has a fixed aspect ratio from its `viewBox` (no layout shift).
- `@wyg/video` root is not imported from a server component (it pulls client-only modules); use subpath exports.

## Review Focus

1. A recap with no active days: every tile flat, no busiest building, no glow, no Cell, no crash.
2. A busiest day with a count far above the rest: Cell still lands on that roof, inside the SVG box.
3. 375 px wide: the city never overlaps the form or pushes the page sideways.
4. Reduced motion: the finished city shows immediately.
5. Screen readers: one accessible name for the illustration; Cell's art is decorative.

---

### Task 1: City paths

**Files:**

- Modify: `packages/video/package.json` (exports `"./city": "./src/world/city.ts"`, `"./sample": "./src/fixtures/sample-recap.ts"`)
- Create: `apps/web/src/components/landing/city-paths.ts`
- Test: `apps/web/src/components/landing/city-paths.test.ts`

**Interfaces:**

- Produces: `cityPaths(data: RecapData): CityPaths` where
  `type CityPaths = { viewBox: string; ground: string; faces: { fill: string; d: string }[]; edges: string; weeks: number; busiest: { x: number; y: number } | null }` (coordinates in viewBox units; `busiest` is the centre of the busiest roof). `faces` holds one entry per distinct fill (top and two side shades per level), so its length is at most 12.

- [ ] Test: `cityPaths(sampleRecap)` has `faces.length <= 12`, a non-empty `ground`, and `busiest` not null and inside the viewBox.
- [ ] Test: for a recap whose calendar counts are all 0, `faces` is empty, `busiest` is null, `ground` is non-empty.
- [ ] Test: the busiest roof is the highest point (its `y` is the minimum top `y` of all buildings).
- [ ] Run `bun test apps/web/src/components/landing/city-paths` → fails.
- [ ] Implement with `buildCity`, `isoPoint`, `plotHeight`, `cityBounds`; faces shaded as top / top mixed 18% toward `#0d1117` / 32% (same rule as `CityLayer.faces`), painted back to front (higher `col + row` later). Run → passes.
- [ ] Commit `feat(web): build the hero city's SVG paths from a recap`.

### Task 2: Hero city component and page

**Files:**

- Create: `apps/web/src/components/landing/hero-city.tsx`
- Modify: `apps/web/src/app/page.tsx` (hero), `apps/web/src/app/globals.css` (keyframes), `DESIGN.md` ("Web", "Public pages")

**Interfaces:**

- Consumes: `cityPaths` (Task 1).
- Produces: `<HeroCity />` server component.

- [ ] `HeroCity`: `<figure>` with an `<svg role="img" aria-label="Illustration: a year of contributions drawn as a city, one building per day, from a sample recap." viewBox=…>`, ground path (stroke `#30363d`, no fill), face paths, edge path (hairline), a radial-gradient glow at `busiest`, and `<figcaption>` "Sample year". Cell: `<Art id=… alt="" priority>` absolutely positioned at `busiest` (percentages of the viewBox), omitted when `busiest` is null.
- [ ] Entrance: faces in a `<g>` per week band with `style={{ animationDelay }}` and a `city-rise` keyframe (translate up from the ground + fade), total about 1.2 s; glow and Cell after; all inside `motion-safe:`.
- [ ] `page.tsx`: hero background becomes `bg-canvas`; `<Art id="hero-cast">` replaced by `<HeroCity />`; the hero `CellField` removed (the closing one stays).
- [ ] DESIGN.md: the one green glow as the exception to "no gradients"; the hero city replaces the hero cell strip.
- [ ] Verify in the browser at 375, 768 and 1440 px: no overlap, no horizontal scroll, no console errors; reduced motion shows the finished city. Screenshots for the maintainer.
- [ ] `bun run typecheck && bun test && bun run lint` pass.
- [ ] Commit `feat(web): draw the landing hero as an isometric contribution city`.
