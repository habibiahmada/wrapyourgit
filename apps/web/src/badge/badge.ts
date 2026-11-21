import { EDITION_YEAR, type RecapData } from "@wyg/schema";
import { ARCHETYPE_LABELS } from "@wyg/video/copy";
import { heatLevels } from "@wyg/video/heat";
import { LOGO_CELLS } from "../components/site/logo-mark";
import { ARCHETYPE_ART, type BadgeImage } from "./archetype-art";
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

/** `?archetype=` on the card: which side the archetype's diorama stands on. Left by default. */
export function cardSide(value: string | null | undefined): CardSide {
  return value === "right" ? "right" : "left";
}

interface Run {
  text: string;
  color: string;
  bold?: boolean;
}

interface Content {
  runs: Run[];
  /** A colour dot before the value: the language's own colour. */
  swatch?: string;
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
        swatch: top.color ?? MUTED,
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

/** One run of text at `x`, held to its estimated width so every system's face fits the layout. */
function text(run: Run, x: number, y: number, size: number, anchor?: "end"): string {
  const width = textWidth(run.text, size, run.bold).toFixed(1);
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
    if (content.swatch) {
      swatch = `<circle cx="${(valueX + 4).toFixed(1)}" cy="${BADGE_HEIGHT / 2}" r="4" fill="${content.swatch}" stroke="${EDGE}" stroke-width="0.5"/>`;
      valueX += 13;
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

const CARD_HEIGHT = 200;
const STATS_WIDTH = 500;
const PANEL_WIDTH = 220;
const CARD_PAD = 18;
const GRID_TOP = 52;
const STEP = (STATS_WIDTH - CARD_PAD * 2) / 53;
const CELL = 7;

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
function grid(recap: RecapData | null, year: number, left: number): string {
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
    const y = (GRID_TOP + (index % 7) * STEP).toFixed(1);
    const kind = !recap || (end && date > end) ? "f" : `l${levels.get(date) ?? 0}`;
    weeks[week] ??= [];
    weeks[week].push(`<use href="#d" y="${y}" class="${kind}"/>`);
  });
  const styles = `<style>${HEAT.map((color, level) => `.l${level}{fill:${color}}`).join("")}.f{fill:none;stroke:${SURFACE}}</style>`;
  const square = `<defs><rect id="d" width="${CELL}" height="${CELL}" rx="1.5"/></defs>`;
  return (
    styles +
    square +
    weeks
      .map((cells, week) => {
        const x = (left + CARD_PAD + week * STEP).toFixed(1);
        return `<g class="w" ${delay(0.15 + week * 0.022)}><g transform="translate(${x} 0)">${cells.join("")}</g></g>`;
      })
      .join("")
  );
}

/** The calendar half of the card, `left` px from the card's edge. */
function stats(recap: RecapData | null, year: number, left: number): string {
  const gridBottom = GRID_TOP + 6 * STEP + CELL;
  const valueY = gridBottom + 36;
  const captionY = valueY + 18;
  const right = left + STATS_WIDTH - CARD_PAD;

  if (!recap) {
    return [
      line(
        [
          { text: "WrapYourGit", color: FG, bold: true },
          { text: String(year), color: MUTED },
        ],
        left + CARD_PAD,
        36,
        16,
      ).svg,
      mark(right - markWidth(5), 23, 5),
      grid(null, year, left),
      `<g class="v" ${delay(1.2)}>${text({ text: `See the ${year} recap`, color: FG }, left + CARD_PAD, valueY, 14)}</g>`,
    ].join("");
  }

  const { total, longestStreak } = recap.contributions;
  const top = recap.languages.top[0];
  const column = left + CARD_PAD + 128;
  const third = left + CARD_PAD + 256;
  const languageValue = top
    ? `<circle cx="${third + 5}" cy="${valueY - 6}" r="5" fill="${top.color ?? MUTED}" stroke="${EDGE}" stroke-width="0.5"/>${text({ text: top.name, color: FG, bold: true }, third + 15, valueY, 16)}`
    : text({ text: "None yet", color: MUTED }, third, valueY, 16);
  const site = { text: "wrapyourgit.com", color: MUTED };
  const siteWidth = textWidth(site.text, 11);

  return [
    text({ text: `@${recap.profile.login}`, color: FG, bold: true }, left + CARD_PAD, 36, 16),
    text(
      { text: recap.meta.isFinal ? String(year) : `${year} so far`, color: MUTED },
      right,
      36,
      12,
      "end",
    ),
    grid(recap, year, left),
    `<g class="v" ${delay(1.1)}>`,
    text({ text: count(total), color: GREEN, bold: true }, left + CARD_PAD, valueY, 20),
    text(
      { text: plural(total, "contribution", "contributions"), color: MUTED },
      left + CARD_PAD,
      captionY,
      11,
    ),
    "</g>",
    `<g class="v" ${delay(1.25)}>`,
    text({ text: count(longestStreak.days), color: GREEN, bold: true }, column, valueY, 20),
    text({ text: "longest streak (days)", color: MUTED }, column, captionY, 11),
    "</g>",
    `<g class="v" ${delay(1.4)}>`,
    languageValue,
    text({ text: "top language", color: MUTED }, third, captionY, 11),
    "</g>",
    mark(right - siteWidth - markWidth(3) - 6, captionY - 7, 3, 1.3),
    text(site, right, captionY, 11, "end"),
  ].join("");
}

/** The archetype half of the card: the landing page's diorama over the archetype's name. */
function archetypePanel(recap: RecapData, left: number): string {
  const id = recap.identity.archetype;
  if (!id) return "";
  const art = ARCHETYPE_ART[id].diorama;
  const box = { width: PANEL_WIDTH - 28, height: 124 };
  const scale = Math.min(box.width / art.width, box.height / art.height);
  const width = art.width * scale;
  const height = art.height * scale;
  const name = ARCHETYPE_LABELS[id];
  const nameWidth = textWidth(name, 18, true);
  const captionWidth = textWidth("archetype", 11);
  const centre = left + PANEL_WIDTH / 2;
  return [
    `<g class="v" ${delay(0.1)}>${image(art, centre - width / 2, 14 + (box.height - height) / 2, width, height)}</g>`,
    `<g class="v" ${delay(0.5)}>`,
    text({ text: name, color: FG, bold: true }, centre - nameWidth / 2, 162, 18),
    text({ text: "archetype", color: MUTED }, centre - captionWidth / 2, 180, 11),
    "</g>",
  ].join("");
}

/**
 * The README card: the login, the year's calendar and three numbers, with the archetype's diorama
 * on `side`. No archetype means no diorama, never one for an archetype the user does not have;
 * `recap` null draws the neutral card, an empty year and a line pointing at the recap.
 */
export function cardSvg(recap: RecapData | null, side: CardSide = "left"): string {
  const year = recap?.meta.year ?? EDITION_YEAR;
  const withPanel = Boolean(recap?.identity.archetype);
  const width = STATS_WIDTH + (withPanel ? PANEL_WIDTH : 0);
  const statsLeft = withPanel && side === "left" ? PANEL_WIDTH : 0;
  const panelLeft = side === "left" ? 0 : STATS_WIDTH;

  let label: string;
  if (recap) {
    const { total, longestStreak } = recap.contributions;
    const top = recap.languages.top[0];
    const id = recap.identity.archetype;
    label = `${recap.profile.login}'s ${year} on WrapYourGit${recap.meta.isFinal ? "" : " so far"}: ${count(total)} ${plural(total, "contribution", "contributions")}, longest streak ${count(longestStreak.days)} ${plural(longestStreak.days, "day", "days")}${top ? `, top language ${top.name}` : ""}${id ? `, ${ARCHETYPE_LABELS[id]} archetype` : ""}, through ${day(recap.meta.periodEnd)}`;
  } else {
    label = `WrapYourGit ${year}: see the recap`;
  }

  const divider = withPanel ? (side === "left" ? PANEL_WIDTH : STATS_WIDTH) : 0;
  const body = [
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${CARD_HEIGHT - 1}" rx="11.5" fill="${HEAD}" stroke="${EDGE}"/>`,
    withPanel
      ? `<rect x="${divider}" y="16" width="1" height="${CARD_HEIGHT - 32}" fill="${SURFACE}"/>`
      : "",
    recap && withPanel ? archetypePanel(recap, panelLeft) : "",
    stats(recap, year, statsLeft),
  ].join("");
  return svg(width, CARD_HEIGHT, label, body);
}
