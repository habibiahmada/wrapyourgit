# 0003. Four aspect ratios, three layout families

- Status: Accepted, web sizing amended by [0024](0024-the-web-story-fills-the-window.md)
- Date: 2026-11-04

## Context

MP4 export in 9:16, 4:5, 1:1, 16:9, and the web story must fit any viewport. Designing every scene four times is too costly; simply scaling one layout wastes space or clips text.

## Decision

Map formats onto layout families (`packages/schema/src/formats.ts`):

| Family    | Formats  | Web viewport                      |
| --------- | -------- | --------------------------------- |
| portrait  | 9:16     | ratio < 0.7 (phones)              |
| compact   | 4:5, 1:1 | 0.7–1.3 (tablets, square windows) |
| landscape | 16:9     | ratio > 1.3 (desktop)             |

Scenes call `useLayout()` and size everything relative to composition `width`/`height`. Web picks the nearest export format for the viewport and passes those dimensions to the Player (letterboxed, `style={{width: "100%"}}`).

## Consequences

Three layouts per scene to design and test. Visual tests render a still per format per scene.
