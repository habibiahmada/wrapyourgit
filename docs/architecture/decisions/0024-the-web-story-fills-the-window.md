# 0024. The web story fills the window, and keeps its files at the closing stop

- Status: Accepted
- Date: 2026-11-13
- Amends: [0003](0003-layout-families.md) (how the web sizes the story); [0016](0016-exports-in-the-browser.md) (where the files are offered)

## Context

The web story used the export format nearest the window's shape and letterboxed it on paper, with a strip above for Sound and Close. The maintainer wanted the story to fill the screen with nothing round it, the controls over the story, no Close button, and the files offered on the closing stop itself instead of a screen after it (#94).

## Decision

1. **The composition takes the window's shape.** The web Player gets a composition whose short side is 1080 and whose long side follows the window (`stageSize`, in steps of 8, held to 21:9 either way) and covers the window. Scenes already size everything from `width` and `height`, and the layout family still comes from the ratio (0003's table).
2. **A frame narrower than its family's formats sees as wide as the narrowest of them.** A tall phone (1080 × 2336) or a 16:10 laptop would otherwise crop the sides the shots were framed for. The camera's lens keeps the narrowest format's view across (9:16, 4:5 or 16:9) and opens up in height. The export formats are unchanged.
3. **The web controls sit over the story and are never in a file.** Sound is top right, under the progress bar. There is no Close: Escape leaves, and the closing stop offers the way on.
4. **The files are icons on the closing stop.** At the rested closing stop, Video (which opens its four shapes), Slides, PDF, the share card and the way on (dashboard, or a recap of your own) stand as icons on the grass right of the board (`closingShelf`, projected from the stop's rest camera). Each is named for assistive tech and on hover. While a file is made, a small modal dialog shows Cell, a progress bar and one sentence, with Cancel (Escape too). The dashboard keeps its full panel (`ExportPanel`); both share `useExport`.

## Consequences

- The web shows shapes no export has; stills only cover the four formats. The tests pin the closing shelf and the narrow-frame lens across phone, format and wide shapes.
- A resize rebuilds the ride and drops a move in flight; resizes settle for 150 ms first.
- The icons carry no words on screen; their names are in `aria-label` and `title`.
