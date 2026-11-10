# 0002. One Remotion composition powers the web story and MP4 export

- Status: Accepted
- Note (phase 4): the composition this describes, `WrapStory` and its `wrap-*` compositions, was removed. The story world's `WorldStory` keeps the decision: one composition for the web and the files ([0016](0016-exports-in-the-browser.md)).
- Date: 2026-11-04

## Context

PRD v1.1 proposed a live story built with Framer Motion and a separate Remotion composition for export. Two implementations would drift: different timing, layouts, even numbers.

## Decision

`packages/video` exports `WrapStory` (a `<Series>` of scenes). The web story renders it with `@remotion/player`; export renders the same component on Remotion Lambda. Interactivity (tap to advance, pause, mute) is implemented by controlling the Player (seek to scene boundaries from `SCENES`).

## Consequences

- Web preview _is_ the video, which guarantees consistency.
- Scenes must be frame-deterministic: only `useCurrentFrame`, `interpolate`, `spring`, seeded `random`. No Framer Motion, CSS transitions, timers or chart-library animations inside scenes. Charts are hand-written SVG.
- Rich web-only interactions (hovering a repo for details) belong in the dashboard, not the story.
- Player performance on low-end phones must be checked (keep particle counts and blur filters modest; offer reduced motion).

## Alternatives

Separate web animation + Remotion (drift); screen-recording the browser (device-dependent quality, unreliable).
