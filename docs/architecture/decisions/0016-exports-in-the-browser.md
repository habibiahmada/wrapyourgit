# 0016. The story's files are rendered in the viewer's browser

- Status: Accepted
- Date: 2026-11-10
- Supersedes: [0004](0004-render-on-remotion-lambda.md) (MP4 on Remotion Lambda), [0011](0011-slides-from-the-composition.md) (slides rendered on the server)
- Builds on: [0002](0002-one-composition-for-web-and-video.md), [0013](0013-baked-animation-no-webgl.md)

## Context

The story world (spec `docs/superpowers/specs/2026-11-06-story-world-design.md`) is one Remotion composition, `WorldStory`. The MP4 was planned on Remotion Lambda (ADR-0004), and the slides came from a headless Chrome worker beside the web server (ADR-0011), which a serverless host such as Vercel cannot run (ADR-0015). `@remotion/web-renderer` (stable since 4.0.491; the project is on 4.0.540) renders a composition to MP4 and to PNG stills in the browser with WebCodecs. Since ADR-0013 the story draws no WebGL, so the composition fits inside what the web renderer supports.

## Decision

1. **Every file is rendered in the viewer's browser.** The MP4 (H.264 + AAC, 30 fps, the four `VIDEO_FORMATS`) uses `renderMediaOnWeb`, the slides `renderStillOnWeb`; the ZIP (fflate) and the PDF (pdf-lib) are assembled in the browser. Code: `apps/web/src/app/recap/world/exports.ts`, loaded on demand by `ExportPanel`, so the renderer never weighs on the player's first load and never reaches server code. No server, Lambda or worker renders the new story.
2. **Slides are 4:5** (1080 × 1350, the Instagram feed size the earlier slides used), one per stop with letter pages included, each taken at the stop's rest frame in video mode (`slideFrames`, `worldExportComposition` in `packages/video/src/world/export.ts`).
3. **Public projection for every file.** Until phase 4 adds the "Show your private repository names?" choice, every export renders `toPublicRecap(data)` (AGENTS.md rule 6). The page passes it beside the full data. The share card (`/api/card`) stays as it is.
4. **Still behind the development gate.** The old and the new story never ship to users at once. The "Keep your year" screen at the end of `/recap/world` and the dashboard's "Download your story" section render only where `/recap/world` does (`process.env.NODE_ENV !== "production"`). Phase 4 turns both on and switches the story over.
5. **Removals land with phase 4.** The old story (`StoryFlow`) still uses `/api/story/slide/10` and the slide routes, so `apps/renderer`'s still worker and Lambda deploy, `/api/story/{pdf,zip,slide}`, `server/slides.tsx` and `SLIDE_EXPORTS` are deleted with the switch-over, not before.

### Web-renderer limits

Every world scene is built inside them, so the Player and the files show the same picture:

- No `z-index` (elements draw in DOM order), no 3D CSS transforms, no SVG `url()` clip paths or filters, no CSS filters, no `object-position`.
- Fonts embed only in SVG text, loaded with `@remotion/google-fonts`.
- `Html5Audio` is not supported; the world plays sound with `<Audio>` from `@remotion/media`. The old story keeps its `Html5Audio` until it is removed.
- Rendering is single-threaded and shares the tab; the tab must stay visible while it renders (a hidden tab slows it down). The panel says so while a render runs.

## Alternatives

- **Keep Lambda for the MP4 (ADR-0004) and the Chrome worker for slides (ADR-0011):** the same pixels on every device, but an AWS deploy per composition change, a cost per render, and slides that cannot run on Vercel. Rejected for the new story.
- **Our own SVG → canvas → WebCodecs pipeline:** full control, but we would build the encoder, audio mix and slide export that the web renderer already provides (spec, approach B').

## Consequences

- No render cost and no render server; the export works on any host, including Vercel.
- A browser without WebCodecs, or without H.264/AAC encoding, cannot make the video. The panel checks first (`exportSupport`), says what it can't make, and still offers the slides when stills work and the share card in any case.
- A render takes as long as the viewer's device needs, and it stops when the viewer cancels or leaves the screen.
- Licence: Remotion, `@remotion/web-renderer` included, is free for individuals and companies of three people or fewer (this is a personal project). Re-check https://remotion.dev/license before launch and if the project ever becomes a company product.
- Until phase 4, Lambda and the slide worker stay in the repository for the old story, and AGENTS.md and `docs/video/scene-system.md` describe both paths.
