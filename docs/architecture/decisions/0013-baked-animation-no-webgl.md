# 0013. Cell moves through baked loops, with no WebGL in the browser

- Status: Accepted
- Note (phase 4): the old story's `Sprite` and `SpriteAccent` were removed with it ([0016](0016-exports-in-the-browser.md)). The bake, the pages' art and `head-cell` still work as described.
- Date: 2026-11-05
- Supersedes: points 4 and 5 of [0010](0010-live-3d-cast.md) (live rendering on the web Player and on Lambda)

## Context

ADR-0010 rendered the cast live with WebGL every frame, and the web pages showed still PNGs. The maintainer asked for every picture of Cell to move, as 3D, but in a format that is not live 3D in the browser, so pages (above all the landing page) stay light; the characters must still move. Asked whether the story player should follow, the maintainer chose pages and story both.

## Decision

1. **Every motion loops in two seconds.** `three/pose.ts` keeps every cycle a divisor of `LOOP_SECONDS` (four beats at 120 BPM), blinks included; `cast.test.ts` checks that every pose at `t` equals the pose at `t + 2`.
2. **One bake, two formats** (`scripts/render-art.ts`, `src/art.ts`). Each composition in `Root.tsx` is one loop at 15 fps (30 frames), rendered with the still renderer (`renderCompositionFrames`, one bundle, one browser, angle-egl). For the pages, ffmpeg assembles a looping animated WebP (`public/art/<id>.webp`, 720 px wide) and keeps the frame at the motion's peak as `<id>.png`. For the story, ImageMagick lays the frames out as a 6 × 5 sprite sheet (`public/sprites/<id>.webp`, 512 px frames).
3. **Pages** show `<Art>` (`apps/web/src/components/art.tsx`): a `<picture>` with the WebP, and the PNG under `prefers-reduced-motion: reduce`. `three`, `@react-three/*` are no longer dependencies of the web app.
4. **The story** draws `Sprite` (`components/Sprite.tsx`): the sheet frame for the current frame (`spriteFrame`), so a frame always shows the same pose and the Player, the MP4 and the slides agree. `SpriteAccent` replaces `LiveAccent`; the cut dash and the giant silhouettes use sprites too (side sprites are mirrored for leftward runs).
5. **The letterhead** uses `head-cell`: Cell's head alone, nodding, close up.

## Alternatives

- **Live WebGL on the story, WebP on pages:** smoothest motion in the story, but the Player still needs WebGL on phones. Offered; the maintainer chose sprites everywhere.
- **Video with alpha (WebM VP9 / HEVC):** smaller files, but Safari needs HEVC with alpha in a separate file, and seeking a `<video>` frame-exactly inside Remotion is slower and less deterministic than a sprite sheet.
- **Remotion's `<AnimatedImage>`:** plays animated WebP frame-exactly, but decodes with `ImageDecoder`, which Safari lacks.

## Consequences

- No WebGL in any browser view. Rendering on Lambda no longer needs WebGL either (`chromiumOptions.gl` only matters for baking).
- Motion is fixed per loop: a new pose, look or gear means a re-bake (`bun scripts/render-art.ts <ids>`, about 75 s per loop).
- 15 fps against the 30 fps story ("on twos"): visibly a little steppier than live rendering.
- Weight: a page loop is about 200-450 KB, a sprite sheet about 200-300 KB; pages lazy-load everything below the fold.
