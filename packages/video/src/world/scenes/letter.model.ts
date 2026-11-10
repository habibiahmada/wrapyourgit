import type { Letter } from "../../letter";
import { SCENE_WIDTH, safeArea, sceneHeight } from "./fit";

type Size = { width: number; height: number };

/** Same per-character estimate as `fitFontSize`, so a wrapped line is never wider than it allows. */
const CHAR_EM = 0.62;
/** Body text as a share of the frame's shorter side. */
const BODY_SHARE = 0.042;
const LINE_HEIGHT = 1.42;

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
  maxChars: number;
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
  const body = BODY_SHARE * Math.min(size.width, size.height) * unitsPerPx;
  const lineHeight = body * LINE_HEIGHT;

  const landscape = size.width > size.height * 1.2;
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
  const maxChars = Math.max(1, Math.floor(textWidth / (body * CHAR_EM)));

  return {
    sheet,
    body,
    lineHeight,
    head,
    strip,
    textX,
    textWidth,
    firstBaseline,
    maxChars,
    linesPerPage,
    tabBaseline,
  };
}

/** Greedy wrap at word boundaries. A word longer than a line gets a line of its own, unsplit. */
export function wrapWords(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > maxChars) {
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
  const { maxChars, linesPerPage } = letterGeometry(size);
  const blocks: { kind: LetterLineKind; lines: string[] }[] = [
    { kind: "greeting" as const, lines: wrapWords(letter.greeting, maxChars) },
    ...letter.paragraphs.map((p) => ({ kind: "body" as const, lines: wrapWords(p, maxChars) })),
    { kind: "signOff" as const, lines: wrapWords(letter.signOff, maxChars) },
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
      // Room for the gap and only one line of a longer paragraph: start it on the next page. Short
      // pages (landscape, square) keep the line: a page a quarter empty reads worse than a lone line.
      if (lines.length > 1 && linesPerPage >= 12 && linesPerPage - page.length <= 2) turn();
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
