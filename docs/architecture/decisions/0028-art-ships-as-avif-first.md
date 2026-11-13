# 0028. Baked art ships as AVIF first, WebP and PNG second

- Status: Accepted
- Date: 2026-11-13
- Extends: [ADR-0013](0013-baked-animation-no-webgl.md) (one bake, two formats) and [ADR-0022](0022-archetype-art-is-a-city-block.md) (a city block in two layers)

## Context

The landing page loads eleven baked loops and ten city-block stills from `public/art`. Measured on the page: the animated WebP loops weighed 150 to 220 KB each, about 1.8 MB together, and the WebP stills about 630 KB more. `<Art>` serves these files as they are, without the image optimizer, so nothing on the way made them smaller. The story frames on the same page go through `next/image`, which only produced WebP.

## Decision

1. **Every page file of the art has an AVIF copy beside it.** `<id>.webp` gets `<id>.avif` (looping when the WebP loops), `<id>-base.webp` gets `<id>-base.avif`, and the reduced-motion still `<id>.png` gets `<id>-still.avif`. The WebP and PNG stay: browsers without AVIF, the story's canvas and the share card read them.
2. **`<Art>` lists AVIF first** in each `<picture>`, so a browser that reads AVIF fetches the lighter file and the rest fall through to WebP or PNG. Reduced motion keeps its own sources: the still AVIF, then the PNG.
3. **The alpha is a second track.** An AVIF stores transparency as a separate grey image. ffmpeg 6.1's AVIF muxer drops alpha unless it is given that track, and a loop without alpha would cover the still under it. `scripts/lib/avif.ts` splits colour and alpha before encoding (`format=yuva420p,split`, `alphaextract`, two `-map`s), with libaom at CRF 36 for loops and 30 for stills.
4. **The bake writes AVIF from its own frames.** `scripts/render-art.ts` calls the same helpers on the PNG frames it renders, so a new bake starts from lossless frames. `scripts/art-avif.ts` converts files already baked: ffmpeg cannot read an animated WebP, so sharp (Next's image library) unpacks the frames first.
5. **`next/image` offers AVIF too** (`images.formats: ["image/avif", "image/webp"]` in `next.config.ts`).

## Consequences

- All 53 files: 6,623 KB of WebP and PNG became 1,616 KB of AVIF (-76%). A loop went from about 190 KB to about 35 KB; a city-block still from about 64 KB to about 36 KB; a reduced-motion still from about 150 KB to about 40 KB. A story frame through `next/image` went from 29 KB (WebP) to 18 KB (AVIF).
- Checked in the browser: AVIF loops and stills keep their transparency over a coloured background, the loops play, and the page picks the AVIF sources.
- The repository carries both formats, about 1.6 MB more. The WebP stays the fallback, so nothing breaks in a browser without AVIF.
- AV1 encodes slowly: converting every file takes a few minutes. That cost is paid once per bake, not per visit.
- The files converted by `scripts/art-avif.ts` come from the lossy WebP, a second generation. The next `render-art.ts` bake replaces them with copies made from lossless frames.
