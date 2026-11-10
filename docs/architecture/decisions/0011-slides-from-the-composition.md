# 0011. Exported slides are frames of the story composition

- Status: Superseded by [0016](0016-exports-in-the-browser.md) for the story world. Still governs the current story's slides until phase 4 switches the story over.
- Date: 2026-11-05
- Builds on: [0002](0002-one-composition-for-web-and-video.md), [0010](0010-live-3d-cast.md)

## Context

The PNG, ZIP and PDF exports drew ten slides with `next/og`: hand-made layouts that imitated each chapter and used baked PNGs of the old mascot. After the live chibi cast (ADR-0010), the exports no longer looked like the story the person had just watched. The maintainer asked for slides that match what the story shows.

## Decision

1. **Slides 1-9 are frames of the composition.** Each is the chapter's finished last frame (where the story Player holds) of `wrap-4x5` (1080 × 1350, the slide size), rendered with the public projection by `renderSceneStill` in `@wyg/renderer/still`. Same composition as the story and the MP4 (ADR-0002), so cast, layout and numbers match exactly.
2. **Slide 10, the letter,** lives on the web page, not in the composition, and stays a `next/og` render in the story's letter design, with the baked chibi Cell.
3. **Locally:** `@remotion/bundler` builds the composition once per server process, `@remotion/renderer` renders with one shared headless Chrome, and frames render **one at a time** (parallel WebGL tabs timed out on the live cast of ADR-0010; since ADR-0013 the story draws sprites and only the art bake needs WebGL). The WebGL backend is `angle-egl` on Linux and `angle` elsewhere; `REMOTION_GL` overrides it (`swangle` on a machine without a GPU). Rendering runs in a separate Bun process (`still-worker.ts`, driven by `still-client.ts` over JSON lines), so Next never imports Remotion: Turbopack could not load the hashed external modules Bun's isolated installs produce. The art bake (`scripts/render-art.ts`) reuses the same renderer, so one bundle serves every still.
4. **Cached** per user, sync time and slide (`slidePng`, `"use cache"`), so a ZIP or PDF renders each slide once per recap version.

## Alternatives

- **Keep `next/og` and swap in baked chibi PNGs per chapter:** fast (about a second per slide), but still an imitation; the layout and the cast's pose would differ from the story. Offered; the maintainer chose exact frames.
- **Render the frames in the browser from the Player:** no server cost, but needs WebGL on the viewer's device and a capture path per browser, and the PNG would differ by device.

## Consequences

- The first export after a sync takes longer: the bundle on first use (tens of seconds), then each chapter frame. Later exports of the same recap are served from the cache.
- The web server needs Chrome. That holds on a developer machine and on a self-managed server, **not** on a serverless host such as Vercel. Production should render the same frames with `renderStillOnLambda` (the Lambda already renders the MP4, ADR-0004) before the exports go live there; until then the exports are a local and self-hosted feature.
- The baked art (`public/art/*.png`) is now only for the web pages, loading states, the OG image and the letter slide. It is baked from the same chibi rig as the story (`three/ArtStill.tsx`), so no page shows a different mascot.
