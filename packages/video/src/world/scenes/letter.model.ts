import { layoutForSize } from "@wyg/schema";
import type { Letter } from "../../letter";
import { type LabelWeight, labelWidth, SCENE_WIDTH, safeArea, sceneHeight } from "./fit";

type Size = { width: number; height: number };

/** Body text as a share of the frame's shorter side. */
const BODY_SHARE = 0.042;
/**
 * Square frames have the least height per line of text: a slightly smaller body there keeps the
 * sample letter to five pages instead of seven (ruling R8).
 */
const SQUARE_BODY_SHARE = 0.036;
const LINE_HEIGHT = 1.42;
/**
 * Pages at least this tall move a paragraph's lone first line to the next page. Shorter pages
 * (landscape 8 lines, square 11) keep it: leaving two of eight lines empty reads worse than a lone
 * line at the foot, while two of twenty in a tall frame goes unnoticed.
 */
const ORPHAN_MIN_LINES = 12;

export type LetterGeometry = {
  /** The paper sheet in scene units. */
  sheet: { x: number; y: number; width: number; height: number };
  /** Body font size and baseline-to-baseline step, in scene units. */
  body: number;
  lineHeight: number;
  /** Letterhead: Cell's head centre and size, and the contribution strip under it. */
  head: { x: number; y: number; size: number };
  strip: { y: number; height: number };
  /** Left edge and width of the text column. */
  textX: number;
  textWidth: number;
  /** Baseline of a page's first line. */
  firstBaseline: number;
  linesPerPage: number;
  /** Baseline of the "n / N" tab at the foot of the sheet. */
  tabBaseline: number;
};

/**
 * Where everything sits on the letter's sheet for a frame size. Pagination and the scene both read
 * it, so the lines a page holds are the lines the scene has room to draw. Tall frames fill their
 * height with the sheet; landscape keeps a page-shaped sheet with the desk around it.
 */
export function letterGeometry(size: Size): LetterGeometry {
  const h = sceneHeight(size);
  const safe = safeArea(size);
  const unitsPerPx = SCENE_WIDTH / size.width;
  const square = Math.abs(size.width / size.height - 1) < 0.1;
  const body =
    (square ? SQUARE_BODY_SHARE : BODY_SHARE) * Math.min(size.width, size.height) * unitsPerPx;
  const lineHeight = body * LINE_HEIGHT;

  const landscape = layoutForSize(size.width, size.height) === "landscape";
  const top = safe.top + body * 0.4;
  const height = h - top - safe.bottom - body * 0.4;
  const width = landscape ? Math.min(SCENE_WIDTH - 2 * body, height * 1.5) : SCENE_WIDTH - body * 2;
  const sheet = { x: (SCENE_WIDTH - width) / 2, y: top, width, height };

  const pad = body * 1.4;
  const headSize = body * 2.3;
  const head = { x: sheet.x + pad + headSize / 2, y: sheet.y + pad + headSize / 2, size: headSize };
  const strip = { y: head.y + headSize / 2 + body * 0.5, height: body * 0.4 };
  const textX = sheet.x + pad;
  const textWidth = sheet.width - 2 * pad;
  const firstBaseline = strip.y + strip.height + body * 1.0 + body;
  const tabBaseline = sheet.y + sheet.height - pad * 0.8;
  // The last line's descenders stay clear of the tab's cap height plus a gap.
  const textBottom = tabBaseline - body * 1.6;
  const linesPerPage = Math.max(1, Math.floor((textBottom - firstBaseline) / lineHeight) + 1);

  return {
    sheet,
    body,
    lineHeight,
    head,
    strip,
    textX,
    textWidth,
    firstBaseline,
    linesPerPage,
    tabBaseline,
  };
}

/**
 * Greedy wrap at word boundaries, measuring with the shared `labelWidth` so a line is as wide as
 * the scene's Label will set it. A word longer than a line gets a line of its own, unsplit.
 */
export function wrapWords(text: string, fits: (line: string) => boolean): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && !fits(`${line} ${word}`)) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export type LetterLineKind = "greeting" | "body" | "signOff" | "gap";
export type LetterLine = { text: string; kind: LetterLineKind };

/**
 * The letter as pages of styled lines. A blank line separates paragraphs but never opens or ends
 * a page, a paragraph doesn't start with a lone line at a page's foot, and no page is empty.
 */
export function paginateLetterLines(letter: Letter, size: Size): LetterLine[][] {
  const { body, textWidth, linesPerPage } = letterGeometry(size);
  // The greeting and sign-off are set bold (wider glyphs), the body regular.
  const wrap = (text: string, weight: LabelWeight) =>
    wrapWords(text, (line) => labelWidth(line, body, weight) <= textWidth);
  const blocks: { kind: LetterLineKind; lines: string[] }[] = [
    { kind: "greeting" as const, lines: wrap(letter.greeting, 700) },
    ...letter.paragraphs.map((p) => ({ kind: "body" as const, lines: wrap(p, 400) })),
    { kind: "signOff" as const, lines: wrap(letter.signOff, 700) },
  ].filter((block) => block.lines.length > 0);

  const pages: LetterLine[][] = [];
  let page: LetterLine[] = [];
  const turn = () => {
    while (page.at(-1)?.kind === "gap") page.pop();
    if (page.length > 0) pages.push(page);
    page = [];
  };
  for (const { kind, lines } of blocks) {
    if (page.length > 0) {
      // Room for the gap and only one line of a longer paragraph: start it on the next page.
      if (lines.length > 1 && linesPerPage >= ORPHAN_MIN_LINES && linesPerPage - page.length <= 2)
        turn();
      else page.push({ text: "", kind: "gap" });
    }
    for (const text of lines) {
      if (page.length >= linesPerPage) turn();
      page.push({ text, kind });
    }
  }
  turn();
  return pages;
}

/** The letter as pages of lines, for a frame size; "" is the blank line between paragraphs. */
export function paginateLetter(letter: Letter, size: Size): string[][] {
  return paginateLetterLines(letter, size).map((page) => page.map((line) => line.text));
}
