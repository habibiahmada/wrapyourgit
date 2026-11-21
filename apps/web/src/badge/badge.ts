import { EDITION_YEAR, type RecapData } from "@wyg/schema";
import { ARCHETYPE_LABELS } from "@wyg/video/copy";
import { heatLevels } from "@wyg/video/heat";
import { languageIcon } from "@wyg/video/languages";
import { LOGO_CELLS } from "../components/site/logo-mark";
import { ARCHETYPE_ART, type BadgeImage } from "./archetype-art";
import { LANGUAGE_ICONS } from "./language-icons";
import { textWidth } from "./text-width";

/*
 * README badges and the README card (ADR-0035). Plain SVG strings: a README image is an <img>
 * behind GitHub's proxy, so it can load no font, script, stylesheet or image of its own. Callers
 * pass the PUBLIC recap (loadPublicRecap) or null, and null draws the neutral image, the same for
 * a hidden, unknown or not-yet-fetched account so the image never tells them apart.
 *
 * Both play a short entrance once (under two seconds) and then hold still: an <img> can carry no
 * pause button, so nothing loops, and a reader who asks for reduced motion sees the still image.
 */

// The site's warm ink (DESIGN.md "Web"). Contrast measured with antislop's checker: fg 16.5:1 on
// HEAD and 14.5:1 on SURFACE, muted 7.3:1 and 6.4:1, green 8.0:1 on SURFACE.
const HEAD = "#0b0a08";
const SURFACE = "#1b1a16";
const FG = "#eeeae0";
const MUTED = "#a29d90";
const GREEN = "#4cc764";
// inkSoft: the darkest edge still visible on GitHub's dark README background (2.7:1 on #0d1117).
const EDGE = "#5c584e";
// GitHub's contribution greens, as on the site; level 0 is SURFACE.
const HEAT = [SURFACE, "#0e4429", "#006d32", "#26a641", "#39d353"];
const FONT = "Mona Sans,-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif";

/*
 * The entrance: `.c` cells and `.w` calendar weeks fade in, `.v` values rise into place. The
 * resting state is the final one (`backwards` only paints the start before each delay ends), so a
 * renderer without CSS animation still shows the whole image.
 */
const MOTION = `<style>@media (prefers-reduced-motion:no-preference){.c,.w{animation:wyg-in .4s ease-out backwards}.v{animation:wyg-up .5s ease-out backwards}}@keyframes wyg-in{from{opacity:0}}@keyframes wyg-up{from{opacity:0;transform:translateY(4px)}}</style>`;
const delay = (seconds: number) => `style="animation-delay:${seconds.toFixed(2)}s"`;

export const BADGE_SHOWS = ["contributions", "streak", "days", "language", "archetype"] as const;
export type BadgeShow = (typeof BADGE_SHOWS)[number];

/** At most this many values in one badge, so it stays a badge. */
export const MAX_SHOWS = 4;

/**
 * `?show=` as a list: comma-separated, in the order given, each once, unknown names dropped, at
 * most MAX_SHOWS. Nothing usable means the default, contributions.
 */
export function badgeShows(value: string | null | undefined): BadgeShow[] {
  const shows: BadgeShow[] = [];
  for (const part of (value ?? "").split(",")) {
    const show = BADGE_SHOWS.find((known) => known === part.trim().toLowerCase());
    if (show && !shows.includes(show)) shows.push(show);
  }
  return shows.length ? shows.slice(0, MAX_SHOWS) : ["contributions"];
}

export type CardSide = "left" | "right";
export type CardLayout = "wide" | "compact";
export const CARD_PARTS = ["archetype", "name", "graph", "stats"] as const;
export type CardPart = (typeof CARD_PARTS)[number];

export interface CardOptions {
  /** Wide (720 px at most, side by side) or compact (360 px, stacked for phones). */
  layout: CardLayout;
  /** Which side the archetype's diorama stands on, on the wide card. */
  side: CardSide;
  archetype: boolean;
  /** The archetype's name and the line under it, below the diorama. */
  name: boolean;
  graph: boolean;
  stats: boolean;
}

/**
 * The card's query: `?layout=compact` stacks it for phones, `?archetype=left|right` places the
 * diorama on the wide card (left by default), and `?hide=archetype,name,graph,stats` leaves parts
 * out, unknown names ignored. Hiding every part would leave an empty frame, so it gets the default
 * parts instead.
 */
export function cardOptions(query: {
  layout?: string | null;
  archetype?: string | null;
  hide?: string | null;
}): CardOptions {
  const hidden = new Set((query.hide ?? "").split(",").map((part) => part.trim().toLowerCase()));
  const shown = (part: CardPart) => !hidden.has(part);
  const options: CardOptions = {
    layout: query.layout === "compact" ? "compact" : "wide",
    side: query.archetype === "right" ? "right" : "left",
    archetype: shown("archetype"),
    name: shown("name"),
    graph: shown("graph"),
    stats: shown("stats"),
  };
  if (!options.archetype && !options.graph && !options.stats) {
    return { ...options, archetype: true, name: true, graph: true, stats: true };
  }
  return options;
}

interface Run {
  text: string;
  color: string;
  bold?: boolean;
}

interface Content {
  runs: Run[];
  /** The language's logo, or its colour as a dot when it has none. */
  language?: { name: string; color: string | null };
  /** The value in words, for the image's accessible name. */
  words: string;
}

const count = (n: number) => new Intl.NumberFormat("en-US").format(n);
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * What one value of a badge says, or null when this recap has nothing honest to show for it (no
 * top language, no archetype). "so far" is the badge's to add, once, after the last value.
 */
export function badgeContent(recap: RecapData, show: BadgeShow): Content | null {
  const { contributions } = recap;
  switch (show) {
    case "contributions": {
      const n = contributions.total;
      const noun = plural(n, "contribution", "contributions");
      return {
        runs: [
          { text: count(n), color: GREEN, bold: true },
          { text: noun, color: FG },
        ],
        words: `${count(n)} ${noun}`,
      };
    }
    case "streak": {
      // "longest streak 0 days" reads where "0-day longest streak" would not.
      const n = contributions.longestStreak.days;
      const noun = plural(n, "day", "days");
      return {
        runs: [
          { text: "longest streak", color: FG },
          { text: count(n), color: GREEN, bold: true },
          { text: noun, color: FG },
        ],
        words: `longest streak ${count(n)} ${noun}`,
      };
    }
    case "days": {
      const n = contributions.activeDays;
      const noun = plural(n, "active day", "active days");
      return {
        runs: [
          { text: count(n), color: GREEN, bold: true },
          { text: noun, color: FG },
        ],
        words: `${count(n)} ${noun}`,
      };
    }
    case "language": {
      const top = recap.languages.top[0];
      if (!top) return null;
      return {
        language: { name: top.name, color: top.color },
        runs: [
          { text: top.name, color: FG, bold: true },
          { text: "top language", color: MUTED },
        ],
        words: `top language ${top.name}`,
      };
    }
    case "archetype": {
      const id = recap.identity.archetype;
      if (!id) return null;
      const label = ARCHETYPE_LABELS[id];
      return {
        runs: [
          { text: label, color: FG, bold: true },
          { text: "archetype", color: MUTED },
        ],
        words: `${label} archetype`,
      };
    }
  }
}

const xml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** "21 Nov 2026" from an ISO date, in UTC like the recap's days. */
function day(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

/**
 * One run of text at `x`, held to its estimated width so every system's face fits the layout, or
 * to `maxWidth` when that is narrower (the glyphs close up a little rather than overrun).
 */
function text(
  run: Run,
  x: number,
  y: number,
  size: number,
  anchor?: "end",
  maxWidth = Number.POSITIVE_INFINITY,
): string {
  const width = Math.min(maxWidth, textWidth(run.text, size, run.bold)).toFixed(1);
  return `<text x="${x.toFixed(1)}" y="${y}" fill="${run.color}" font-size="${size}"${
    run.bold ? ' font-weight="700"' : ""
  }${anchor ? ` text-anchor="${anchor}"` : ""} textLength="${width}" lengthAdjust="spacingAndGlyphs">${xml(run.text)}</text>`;
}

/** Runs laid out left to right from `x`, a space apart; returns the SVG and the end x. */
function line(runs: Run[], x: number, y: number, size: number): { svg: string; end: number } {
  let cursor = x;
  const parts = runs.map((run, i) => {
    if (i > 0) cursor += textWidth(" ", size);
    const part = text(run, cursor, y, size);
    cursor += textWidth(run.text, size, run.bold);
    return part;
  });
  return { svg: parts.join(""), end: cursor };
}

/** The six-cell mark (LogoMark), `cell` px squares, top-left at x, y; lit one cell at a time. */
function mark(x: number, y: number, cell: number, start = 0): string {
  const gap = cell * 0.375;
  return LOGO_CELLS.map((color, i) => {
    const cx = x + (i % 3) * (cell + gap);
    const cy = y + Math.floor(i / 3) * (cell + gap);
    return `<rect class="c" ${delay(start + i * 0.06)} x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" width="${cell}" height="${cell}" rx="${(cell * 0.25).toFixed(2)}" fill="${color}"/>`;
  }).join("");
}

const markWidth = (cell: number) => cell * 3 + cell * 0.375 * 2;
const markHeight = (cell: number) => cell * 2 + cell * 0.375;

/**
 * The language's Devicon logo, `size` px square, centred on `cy` from `x`; a dot in its GitHub
 * colour when there is no logo. Decorative: the name is always written beside it.
 */
function languageMark(
  language: { name: string; color: string | null },
  x: number,
  cy: number,
  size: number,
): { svg: string; width: number } {
  const slug = languageIcon(language.name)?.replace(/^lang\/|\.svg$/g, "");
  const href = slug ? LANGUAGE_ICONS[slug] : undefined;
  if (href) {
    return {
      svg: `<image href="${href}" x="${x.toFixed(1)}" y="${(cy - size / 2).toFixed(1)}" width="${size}" height="${size}"/>`,
      width: size,
    };
  }
  const r = size * 0.3;
  return {
    svg: `<circle cx="${(x + r).toFixed(1)}" cy="${cy}" r="${r.toFixed(1)}" fill="${language.color ?? MUTED}" stroke="${EDGE}" stroke-width="0.5"/>`,
    width: r * 2,
  };
}

/** An embedded raster: a README <img> loads nothing from inside the SVG, so it travels as data. */
function image(source: BadgeImage, x: number, y: number, width: number, height: number): string {
  return `<image href="${source.href}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${width.toFixed(1)}" height="${height.toFixed(1)}"/>`;
}

function svg(width: number, height: number, label: string, body: string): string {
  const w = Math.ceil(width);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}" role="img" aria-label="${xml(label)}"><title>${xml(label)}</title>${MOTION}<g font-family="${FONT}">${body}</g></svg>`;
}

const BADGE_HEIGHT = 28;
const BADGE_SIZE = 12;
const BADGE_PAD = 10;
const BADGE_BASELINE = 18;
const BADGE_CELL = 4;

/**
 * A one-line badge: the mark and the year, then each value in `shows` in its own segment. Values
 * this recap has nothing for are left out; with none left, or `recap` null, it is the neutral
 * badge.
 */
export function badgeSvg(recap: RecapData | null, shows: readonly BadgeShow[]): string {
  const year = recap?.meta.year ?? EDITION_YEAR;
  const contents = recap
    ? shows.map((show) => badgeContent(recap, show)).filter((c): c is Content => c !== null)
    : [];
  const soFar = recap && !recap.meta.isFinal;

  // The mark and the year: the product is named in the image's accessible name and on the page it
  // links to, so the badge itself stays short.
  const markTop = (BADGE_HEIGHT - markHeight(BADGE_CELL)) / 2;
  const yearRun = text(
    { text: String(year), color: FG, bold: true },
    8 + markWidth(BADGE_CELL) + 6,
    BADGE_BASELINE,
    BADGE_SIZE,
  );
  const split = 8 + markWidth(BADGE_CELL) + 6 + textWidth(String(year), BADGE_SIZE, true) + 8;

  const segments: string[] = [];
  const dividers: number[] = [];
  let x = split;
  const values: Content[] = contents.length
    ? contents
    : [{ runs: [{ text: `See the ${year} recap`, color: FG }], words: "" }];
  values.forEach((content, i) => {
    if (i > 0) dividers.push(x);
    let valueX = x + BADGE_PAD;
    let swatch = "";
    if (content.language) {
      const logo = languageMark(content.language, valueX, BADGE_HEIGHT / 2, 14);
      swatch = logo.svg;
      valueX += logo.width + 5;
    }
    const last = i === values.length - 1;
    const runs = last && soFar ? [...content.runs, { text: "so far", color: MUTED }] : content.runs;
    const row = line(runs, valueX, BADGE_BASELINE, BADGE_SIZE);
    segments.push(`<g class="v" ${delay(0.3 + i * 0.15)}>${swatch}${row.svg}</g>`);
    x = row.end + BADGE_PAD;
  });
  const width = Math.ceil(x);

  const label =
    recap && contents.length
      ? `${recap.profile.login}'s ${year} on WrapYourGit${soFar ? " so far" : ""}: ${contents.map((c) => c.words).join(", ")}, through ${day(recap.meta.periodEnd)}`
      : `WrapYourGit ${year}: see the recap`;

  const body = [
    `<clipPath id="b"><rect width="${width}" height="${BADGE_HEIGHT}" rx="6"/></clipPath>`,
    `<g clip-path="url(#b)"><rect width="${split.toFixed(1)}" height="${BADGE_HEIGHT}" fill="${HEAD}"/><rect x="${split.toFixed(1)}" width="${(width - split).toFixed(1)}" height="${BADGE_HEIGHT}" fill="${SURFACE}"/></g>`,
    ...dividers.map(
      (d) =>
        `<rect x="${d.toFixed(1)}" y="6" width="1" height="${BADGE_HEIGHT - 12}" fill="${EDGE}"/>`,
    ),
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${BADGE_HEIGHT - 1}" rx="5.5" fill="none" stroke="${EDGE}"/>`,
    mark(8, markTop, BADGE_CELL),
    yearRun,
    ...segments,
  ].join("");
  return svg(width, BADGE_HEIGHT, label, body);
}

const COLUMN_WIDTH = 500;
const PANEL_WIDTH = 220;
const PANEL_HEIGHT = 200;
const CARD_PAD = 18;
const HEADER_BASELINE = 36;
const HEADER_BOTTOM = 50;
const STEP = (COLUMN_WIDTH - CARD_PAD * 2) / 53;
const CELL = 7;
const GRID_HEIGHT = 6 * STEP + CELL;
const DEFAULT_OPTIONS: CardOptions = {
  layout: "wide",
  side: "left",
  archetype: true,
  name: true,
  graph: true,
  stats: true,
};

/** Every day of `year`, in order, as ISO dates (UTC). */
function yearDays(year: number): string[] {
  const days: string[] = [];
  for (let t = Date.UTC(year, 0, 1); t < Date.UTC(year + 1, 0, 1); t += 86_400_000) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}

/**
 * The year as GitHub draws it, a column a week, the weeks coming in left to right: days with a
 * count in their heat level, days not yet reached as outlines, so a recap before December reads
 * as a year still being written.
 */
function grid(
  recap: RecapData | null,
  year: number,
  left: number,
  top: number,
  step = STEP,
  cell = CELL,
): string {
  const days = yearDays(year);
  const offset = new Date(Date.UTC(year, 0, 1)).getUTCDay();
  const levels = new Map<string, number>();
  if (recap) {
    const heat = heatLevels(recap.contributions.calendar);
    recap.contributions.calendar.forEach((d, i) => {
      levels.set(d.date, heat[i] ?? 0);
    });
  }
  const end = recap?.meta.periodEnd;
  // 365 cells are most of the card's markup, so each is a <use> of one shared square, placed by
  // its week's group and coloured by class (l0-l4 heat levels, f a day not reached yet).
  const weeks: string[][] = [];
  days.forEach((date, i) => {
    const index = i + offset;
    const week = Math.floor(index / 7);
    const y = (top + (index % 7) * step).toFixed(1);
    const kind = !recap || (end && date > end) ? "f" : `l${levels.get(date) ?? 0}`;
    weeks[week] ??= [];
    weeks[week].push(`<use href="#d" y="${y}" class="${kind}"/>`);
  });
  const styles = `<style>${HEAT.map((color, level) => `.l${level}{fill:${color}}`).join("")}.f{fill:none;stroke:${SURFACE}}</style>`;
  const square = `<defs><rect id="d" width="${cell}" height="${cell}" rx="${(cell * 0.2).toFixed(1)}"/></defs>`;
  return (
    styles +
    square +
    weeks
      .map((cells, week) => {
        const x = (left + CARD_PAD + week * step).toFixed(1);
        return `<g class="w" ${delay(0.15 + week * 0.022)}><g transform="translate(${x} 0)">${cells.join("")}</g></g>`;
      })
      .join("")
  );
}

/**
 * A card's header: the login on the left, and on the right the mark and the year (where the
 * product signs the card, apart from the numbers). A login can be 39 characters, so its size gives
 * way, down to 11 px, before it would run into the year; past that its letters close up.
 */
function cardHeader(
  recap: RecapData,
  year: number,
  left: number,
  right: number,
  baseline: number,
): string {
  const yearRun = { text: recap.meta.isFinal ? String(year) : `${year} so far`, color: MUTED };
  const signStart = right - textWidth(yearRun.text, 12) - 6 - markWidth(4);
  const login = { text: `@${recap.profile.login}`, color: FG, bold: true };
  const room = signStart - 12 - left;
  const size = Math.max(11, Math.min(16, Math.floor(room / textWidth(login.text, 1, true))));
  return [
    text(login, left, baseline, size, undefined, room),
    mark(signStart, baseline - 9.5, 4),
    text(yearRun, right, baseline, 12, "end"),
  ].join("");
}

/** Height of the calendar column for these parts: the header, then the graph and the numbers. */
function columnHeight(options: CardOptions): number {
  let y = HEADER_BOTTOM;
  if (options.graph) y += 2 + GRID_HEIGHT;
  if (options.stats) y += 74;
  return Math.ceil(y + 18);
}

/**
 * The calendar column: the login, and on the right the mark and the year (where the product signs
 * the card, apart from the numbers), then the graph and the three numbers, as `options` ask.
 */
function column(
  recap: RecapData,
  year: number,
  left: number,
  top: number,
  options: CardOptions,
): string {
  const right = left + COLUMN_WIDTH - CARD_PAD;
  const parts = [cardHeader(recap, year, left + CARD_PAD, right, top + HEADER_BASELINE)];

  let y = top + HEADER_BOTTOM;
  if (options.graph) {
    parts.push(grid(recap, year, left, y + 2));
    y += 2 + GRID_HEIGHT;
  }
  if (options.stats) {
    const valueY = y + 36;
    const captionY = valueY + 18;
    const { total, longestStreak } = recap.contributions;
    const top3 = recap.languages.top[0];
    const second = left + CARD_PAD + 150;
    const third = left + CARD_PAD + 300;
    const logo = top3 && languageMark(top3, third, valueY - 6, 18);
    const language =
      top3 && logo
        ? `${logo.svg}${text({ text: top3.name, color: FG, bold: true }, third + logo.width + 6, valueY, 16)}`
        : text({ text: "None yet", color: MUTED }, third, valueY, 16);
    const start = options.graph ? 1.1 : 0.3;
    parts.push(
      `<g class="v" ${delay(start)}>`,
      text({ text: count(total), color: GREEN, bold: true }, left + CARD_PAD, valueY, 20),
      text(
        { text: plural(total, "contribution", "contributions"), color: MUTED },
        left + CARD_PAD,
        captionY,
        11,
      ),
      "</g>",
      `<g class="v" ${delay(start + 0.15)}>`,
      text({ text: count(longestStreak.days), color: GREEN, bold: true }, second, valueY, 20),
      text({ text: "longest streak (days)", color: MUTED }, second, captionY, 11),
      "</g>",
      `<g class="v" ${delay(start + 0.3)}>`,
      language,
      text({ text: "top language", color: MUTED }, third, captionY, 11),
      "</g>",
    );
  }
  return parts.join("");
}

/**
 * The archetype panel: the landing page's diorama over the archetype's name. On a card of its own
 * (`alone`) it also carries the mark, the login and the year, which the calendar column would.
 * Without the name (`withName` false) the diorama takes the panel's whole height.
 */
function archetypePanel(
  recap: RecapData,
  left: number,
  top: number,
  alone: boolean,
  withName: boolean,
): string {
  const id = recap.identity.archetype;
  if (!id) return "";
  const art = ARCHETYPE_ART[id].diorama;
  const box = { width: PANEL_WIDTH - 28, height: withName ? 124 : PANEL_HEIGHT - 28 };
  const scale = Math.min(box.width / art.width, box.height / art.height);
  const width = art.width * scale;
  const height = art.height * scale;
  const name = ARCHETYPE_LABELS[id];
  const caption = alone
    ? `@${recap.profile.login} · ${recap.meta.isFinal ? recap.meta.year : `${recap.meta.year} so far`}`
    : "archetype";
  const centre = left + PANEL_WIDTH / 2;
  const centred = (run: Run, y: number, size: number) =>
    text(run, centre - textWidth(run.text, size, run.bold) / 2, y, size);
  return [
    alone ? mark(left + 14, top + 14, 4) : "",
    `<g class="v" ${delay(0.1)}>${image(art, centre - width / 2, top + 14 + (box.height - height) / 2, width, height)}</g>`,
    withName
      ? `<g class="v" ${delay(0.5)}>${centred({ text: name, color: FG, bold: true }, top + 162, 18)}${centred({ text: caption, color: MUTED }, top + 180, 11)}</g>`
      : "",
  ].join("");
}

/** The neutral card, the same for every account with no stored recap, whatever the options. */
function neutralCard(year: number): string {
  const height = columnHeight(DEFAULT_OPTIONS);
  const body = [
    `<rect x="0.5" y="0.5" width="${COLUMN_WIDTH - 1}" height="${height - 1}" rx="11.5" fill="${HEAD}" stroke="${EDGE}"/>`,
    line(
      [
        { text: "WrapYourGit", color: FG, bold: true },
        { text: String(year), color: MUTED },
      ],
      CARD_PAD,
      HEADER_BASELINE,
      16,
    ).svg,
    mark(COLUMN_WIDTH - CARD_PAD - markWidth(4), HEADER_BASELINE - 9.5, 4),
    grid(null, year, 0, HEADER_BOTTOM + 2),
    `<g class="v" ${delay(1.2)}>${text({ text: `See the ${year} recap`, color: FG }, CARD_PAD, HEADER_BOTTOM + 2 + GRID_HEIGHT + 36, 14)}</g>`,
  ].join("");
  return svg(COLUMN_WIDTH, height, `WrapYourGit ${year}: see the recap`, body);
}

/**
 * The README card: the login, the year's graph and three numbers, beside the archetype's diorama,
 * each part shown or left out by `options`. No archetype means no diorama, never one for an
 * archetype the user does not have; `recap` null draws the neutral card.
 */
export function cardSvg(recap: RecapData | null, options: CardOptions = DEFAULT_OPTIONS): string {
  const year = recap?.meta.year ?? EDITION_YEAR;
  if (options.layout === "compact") return compactCardSvg(recap, options);
  if (!recap) return neutralCard(year);

  const id = recap.identity.archetype;
  const withPanel = options.archetype && id !== null;
  const withColumn = options.graph || options.stats;
  // Hiding the graph and the numbers of a recap with no archetype would leave nothing: the
  // default parts stand in, as they do when every part is hidden.
  if (!withPanel && !withColumn) return cardSvg(recap, { ...DEFAULT_OPTIONS, layout: "wide" });

  const colHeight = withColumn ? columnHeight(options) : 0;
  const height = Math.max(colHeight, withPanel ? PANEL_HEIGHT : 0);
  const width = (withColumn ? COLUMN_WIDTH : 0) + (withPanel ? PANEL_WIDTH : 0);
  const panelLeft = withColumn && options.side === "right" ? COLUMN_WIDTH : 0;
  const columnLeft = withPanel && options.side === "left" ? PANEL_WIDTH : 0;

  const label = cardLabel(recap, options, withPanel);

  const divider = options.side === "left" ? PANEL_WIDTH : COLUMN_WIDTH;
  const body = [
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="11.5" fill="${HEAD}" stroke="${EDGE}"/>`,
    withPanel && withColumn
      ? `<rect x="${divider}" y="16" width="1" height="${height - 32}" fill="${SURFACE}"/>`
      : "",
    withPanel
      ? archetypePanel(recap, panelLeft, (height - PANEL_HEIGHT) / 2, !withColumn, options.name)
      : "",
    withColumn
      ? column(recap, year, columnLeft, Math.floor((height - colHeight) / 2), options)
      : "",
  ].join("");
  return svg(width, height, label, body);
}

/** The card's accessible name: what it shows, in words, and the day it runs to. */
function cardLabel(recap: RecapData, options: CardOptions, withPanel: boolean): string {
  const { total, longestStreak } = recap.contributions;
  const top = recap.languages.top[0];
  const id = recap.identity.archetype;
  const said = [
    options.stats &&
      `${count(total)} ${plural(total, "contribution", "contributions")}, longest streak ${count(longestStreak.days)} ${plural(longestStreak.days, "day", "days")}${top ? `, top language ${top.name}` : ""}`,
    withPanel && id && `${ARCHETYPE_LABELS[id]} archetype`,
    options.graph && "a calendar of the year",
  ].filter(Boolean);
  return `${recap.profile.login}'s ${recap.meta.year} on WrapYourGit${recap.meta.isFinal ? "" : " so far"}: ${said.join(", ")}, through ${day(recap.meta.periodEnd)}`;
}

const COMPACT_WIDTH = 360;
const COMPACT_STEP = (COMPACT_WIDTH - CARD_PAD * 2) / 53;
const COMPACT_CELL = 5;
const COMPACT_GRID_HEIGHT = 6 * COMPACT_STEP + COMPACT_CELL;
const COMPACT_ROW = 28;

/**
 * The compact card, for phones: 360 px wide, so a README column on a phone shows it at about its
 * own size and its text at the size it was set. The parts stack: the header, the diorama and its
 * name, the numbers as rows (a label on the left, the value on the right, so a long language name
 * has the whole width), then the year's graph. The same `hide` options apply; the side does not.
 */
function compactCardSvg(recap: RecapData | null, options: CardOptions): string {
  const year = recap?.meta.year ?? EDITION_YEAR;
  const right = COMPACT_WIDTH - CARD_PAD;
  const parts: string[] = [];

  if (!recap) {
    // Neutral: the same for every account with no stored recap, whatever the options.
    parts.push(
      line(
        [
          { text: "WrapYourGit", color: FG, bold: true },
          { text: String(year), color: MUTED },
        ],
        CARD_PAD,
        HEADER_BASELINE,
        16,
      ).svg,
      mark(right - markWidth(4), HEADER_BASELINE - 9.5, 4),
      grid(null, year, 0, HEADER_BOTTOM + 2, COMPACT_STEP, COMPACT_CELL),
    );
    const y = HEADER_BOTTOM + 2 + COMPACT_GRID_HEIGHT + 30;
    parts.push(
      `<g class="v" ${delay(1.2)}>${text({ text: `See the ${year} recap`, color: FG }, CARD_PAD, y, 14)}</g>`,
    );
    return compactFrame(y + 22, `WrapYourGit ${year}: see the recap`, parts);
  }

  const id = recap.identity.archetype;
  const withPanel = options.archetype && id !== null;
  if (!withPanel && !options.graph && !options.stats) {
    return compactCardSvg(recap, { ...DEFAULT_OPTIONS, layout: "compact" });
  }

  parts.push(cardHeader(recap, year, CARD_PAD, right, HEADER_BASELINE));
  let y = HEADER_BOTTOM;

  if (withPanel && id) {
    const art = ARCHETYPE_ART[id].diorama;
    const box = { width: COMPACT_WIDTH - CARD_PAD * 2, height: options.name ? 150 : 180 };
    const scale = Math.min(box.width / art.width, box.height / art.height);
    const width = art.width * scale;
    const height = art.height * scale;
    const centre = COMPACT_WIDTH / 2;
    parts.push(
      `<g class="v" ${delay(0.1)}>${image(art, centre - width / 2, y + 4 + (box.height - height) / 2, width, height)}</g>`,
    );
    y += 4 + box.height;
    if (options.name) {
      const name = { text: ARCHETYPE_LABELS[id], color: FG, bold: true };
      const caption = { text: "archetype", color: MUTED };
      parts.push(
        `<g class="v" ${delay(0.4)}>`,
        text(name, centre - textWidth(name.text, 18, true) / 2, y + 24, 18),
        text(caption, centre - textWidth(caption.text, 11) / 2, y + 40, 11),
        "</g>",
      );
      y += 48;
    }
  }

  if (options.stats) {
    const { total, longestStreak } = recap.contributions;
    const top = recap.languages.top[0];
    y += 6;
    const row = (i: number, label: string, value: string) => {
      const baseline = y + i * COMPACT_ROW + 19;
      return `<g class="v" ${delay(0.5 + i * 0.12)}>${
        i > 0
          ? `<rect x="${CARD_PAD}" y="${y + i * COMPACT_ROW}" width="${COMPACT_WIDTH - CARD_PAD * 2}" height="1" fill="${SURFACE}"/>`
          : ""
      }${text({ text: label, color: MUTED }, CARD_PAD, baseline, 12)}${value}</g>`;
    };
    const number = (n: string, unit: string, i: number) => {
      const baseline = y + i * COMPACT_ROW + 19;
      const unitWidth = unit ? textWidth(unit, 12) + textWidth(" ", 12) : 0;
      return `${text({ text: n, color: GREEN, bold: true }, right - unitWidth, baseline, 15, "end")}${
        unit ? text({ text: unit, color: FG }, right, baseline, 12, "end") : ""
      }`;
    };
    let language: string;
    if (top) {
      const baseline = y + 2 * COMPACT_ROW + 19;
      const nameWidth = textWidth(top.name, 14, true);
      // The mark's width depends only on whether the language has a logo, not on where it goes.
      const logoX = right - nameWidth - 6 - languageMark(top, 0, 0, 16).width;
      language = `${languageMark(top, logoX, baseline - 5, 16).svg}${text({ text: top.name, color: FG, bold: true }, right, baseline, 14, "end")}`;
    } else {
      language = text(
        { text: "None yet", color: MUTED },
        right,
        y + 2 * COMPACT_ROW + 19,
        14,
        "end",
      );
    }
    parts.push(
      row(0, "Contributions", number(count(total), "", 0)),
      row(
        1,
        "Longest streak",
        number(count(longestStreak.days), plural(longestStreak.days, "day", "days"), 1),
      ),
      row(2, "Top language", language),
    );
    y += 3 * COMPACT_ROW;
  }

  if (options.graph) {
    y += 12;
    parts.push(grid(recap, year, 0, y, COMPACT_STEP, COMPACT_CELL));
    y += COMPACT_GRID_HEIGHT;
  }

  return compactFrame(y + 18, cardLabel(recap, options, Boolean(withPanel)), parts);
}

function compactFrame(height: number, label: string, parts: string[]): string {
  const h = Math.ceil(height);
  return svg(
    COMPACT_WIDTH,
    h,
    label,
    `<rect x="0.5" y="0.5" width="${COMPACT_WIDTH - 1}" height="${h - 1}" rx="11.5" fill="${HEAD}" stroke="${EDGE}"/>${parts.join("")}`,
  );
}
