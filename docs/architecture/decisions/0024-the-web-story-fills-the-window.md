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
4. **The files are labelled tickets on the closing stop.** At the rested closing stop, Video (which opens its four shapes), Slides, PDF, the share card and the way on (dashboard, or a recap of your own) stand as paper tickets, each a pixel mark and its name, in two columns at the bottom right above the copyright line. Icons alone left the maintainer unsure what each did. The closing camera keeps that corner as open grass: a tall frame frames the party higher (Cell no lower than 70% of the height), a wider one leaves the grass beside the train. While a file is made, a small modal dialog shows Cell, a progress bar and one sentence, with Cancel (Escape too). The dashboard keeps its full panel (`ExportPanel`); both share `useExport`. The video, the slides and the PDF come in the four video shapes (the slides and the PDF render the chosen shape's ride). The share card keeps the link preview's one size, 1200 × 630, and now shows the archetype's city block beside the figures, or Cell waving when there is no archetype.
5. **The terminus is a party on a plaza.** The board across the rail gave way to a plaza on the stop's side, across the rail from the camera: a gate with the date and the year, crowned by twelve bars as tall as each month's contributions; a podium with the contributions, the archetype under a gold trophy, and the active days; balloons on strings, a red carpet, gifts, spotlights, bunting, confetti and fireworks. In the train's last second Cell hops off and lands by the trophy as the train stops, so the stop's rest only ever shows it standing there. The rail keeps 10 units more before the terminus (`CLOSING_ROOM`) so the party's plaza stands clear of the letter's station.

## Consequences

- The web shows shapes no export has; stills only cover the four formats. The tests pin the narrow-frame lens across phone, format and wide shapes, and the podium's words stay readable in every format.
- A resize rebuilds the ride and drops a move in flight; resizes settle for 150 ms first.
