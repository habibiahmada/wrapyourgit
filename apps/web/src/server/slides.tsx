import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { toPublicRecap } from "@wyg/analytics";
import { renderSceneStill } from "@wyg/renderer/still";
import { EDITION_YEAR, type RecapData } from "@wyg/schema";
import { heatLevels } from "@wyg/video/heat";
import { congratsLetter } from "@wyg/video/letter";
import { TIMELINE } from "@wyg/video/timeline";
import { beats } from "@wyg/video/track";
import { and, eq } from "drizzle-orm";
import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { cardFonts } from "./card";
import { db, recaps } from "./db";
import { errorSummary } from "./log";

/*
 * The story as ten still slides (4:5, Instagram feed size) for the PNG, ZIP and PDF exports.
 * Slides 1-9 are each chapter's finished last frame, rendered from the same Remotion composition
 * the story plays (`wrap-4x5`, 1080 × 1350), so an export looks exactly like the story, Cell's
 * pose included (ADR-0011). Slide 10 is the letter, which lives on the web page rather than in
 * the composition, drawn here with next/og. Every slide uses the PUBLIC projection: these files
 * are made to be shared.
 * Plain <img> is correct in the letter (Satori renders the JSX, not a browser); biome.json turns
 * off noImgElement for this file.
 */

export const SLIDE_SIZE = { width: 1080, height: 1350 } as const;
export const SLIDE_TITLES = [
  "Intro",
  "Contributions",
  "Rhythm",
  "Languages",
  "Projects",
  "Community",
  "Engineering",
  "Archetype",
  "Summary",
  "Letter",
] as const;

/** The composition the chapter slides are taken from; its size matches SLIDE_SIZE. */
const SLIDE_COMPOSITION = "wrap-4x5";

/**
 * Last frame of each chapter: where the story Player holds after the chapter has played. From the
 * plain timeline data (chapters last whole beats, as in WrapStory), not the composition module,
 * which is client React and can't be imported into a route.
 */
const LAST_FRAMES = TIMELINE.reduce<number[]>((frames, scene, i) => {
  const start = i === 0 ? 0 : (frames[i - 1] ?? -1) + 1;
  frames.push(start + beats(scene.beats) - 1);
  return frames;
}, []);

const INK = "#14130F";
const PAPER = "#F4EFE3";

/** A baked illustration as a data URL (Satori can't fetch relative paths). */
async function art(id: string): Promise<string> {
  const bytes = await readFile(join(process.cwd(), "public/art", `${id}.png`));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

const GREENS = ["#9BE9A8", "#40C463", "#30A14E", "#216E39"] as const;
const HEAT = ["rgba(20, 19, 15, 0.08)", ...GREENS] as const;
const FAINT = "rgba(20, 19, 15, 0.12)";

/** Margin cells of the paper's motif, as in the web letter (recap/letter-sheet.tsx). */
const MOTIF: { x: number; y: number; s: number; lit?: boolean }[] = [
  { x: 18, y: 380, s: 22 },
  { x: 40, y: 430, s: 14, lit: true },
  { x: 14, y: 700, s: 18 },
  { x: 1040, y: 520, s: 20 },
  { x: 1022, y: 580, s: 12, lit: true },
  { x: 1044, y: 880, s: 16 },
  { x: 26, y: 1060, s: 14 },
  { x: 1030, y: 1180, s: 22 },
];

/**
 * The letter slide, the same stationery as the web letter: Cell's head in the letterhead, a
 * postmark, the person's last weeks of contributions as the rule, a motif of cells and a branch
 * graph on the paper, and the signature with a row of lit cells.
 */
async function renderLetter(data: RecapData): Promise<ImageResponse> {
  const letter = congratsLetter(data);
  const strip = heatLevels(data.contributions.calendar).slice(-53);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: PAPER,
        color: INK,
        padding: "72px 84px 96px",
        fontFamily: "Bricolage",
        position: "relative",
      }}
    >
      {MOTIF.map(({ x, y, s, lit }) => (
        <div
          key={`${x}-${y}`}
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: s,
            height: s,
            borderRadius: 4,
            background: lit ? "rgba(64, 196, 99, 0.45)" : "transparent",
            border: lit ? "none" : `3px solid ${FAINT}`,
          }}
        />
      ))}
      {/* Branch graph along the foot: a trunk, a branch that splits off and merges back. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 48,
          height: 3,
          background: FAINT,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 300,
          width: 260,
          bottom: 48,
          height: 34,
          borderTop: `3px solid ${FAINT}`,
          borderLeft: `3px solid ${FAINT}`,
          borderRight: `3px solid ${FAINT}`,
          borderRadius: "18px 18px 0 0",
        }}
      />
      {[90, 210, 700, 860, 980].map((x) => (
        <div
          key={x}
          style={{
            position: "absolute",
            left: x - 8,
            bottom: 41,
            width: 17,
            height: 17,
            borderRadius: 999,
            background: PAPER,
            border: "3px solid rgba(20, 19, 15, 0.2)",
          }}
        />
      ))}
      {[380, 470].map((x) => (
        <div
          key={x}
          style={{
            position: "absolute",
            left: x - 8,
            bottom: 74,
            width: 17,
            height: 17,
            borderRadius: 999,
            background: "rgba(64, 196, 99, 0.6)",
          }}
        />
      ))}

      {/* Letterhead: Cell's head, the sender, a postmark. */}
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div
          style={{
            display: "flex",
            width: 120,
            height: 120,
            borderRadius: 28,
            overflow: "hidden",
            background: "rgba(155, 233, 168, 0.4)",
          }}
        >
          <img src={await art("head-cell")} width={120} height={120} alt="" />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 40, fontWeight: 800 }}>WrapYourGit</span>
          <span style={{ fontSize: 26, fontWeight: 700, color: "#5C584E" }}>
            From Cell · {data.meta.year} · @{data.profile.login}
          </span>
        </div>
        <div
          style={{
            marginLeft: "auto",
            width: 150,
            height: 150,
            borderRadius: 999,
            border: "5px solid #E4572E",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(-8deg)",
          }}
        >
          <div
            style={{
              width: 112,
              height: 112,
              borderRadius: 999,
              border: "3px solid #E4572E",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#E4572E",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2 }}>DELIVERED</span>
            <span style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{data.meta.year}</span>
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2 }}>BY CELL</span>
          </div>
        </div>
      </div>

      {/* The rule: the last weeks of this person's own graph. */}
      <div style={{ display: "flex", gap: 3, marginTop: 28 }}>
        {strip.map((level, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: one square per day, in order
            key={i}
            style={{
              width: 14.5,
              height: 14.5,
              borderRadius: 3,
              background: HEAT[level] ?? HEAT[0],
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
        {/* flexShrink 0: Satori squeezes flex children instead of overflowing, which stacks them. */}
        <span style={{ fontSize: 44, fontWeight: 800, flexShrink: 0 }}>{letter.greeting}</span>
        {letter.paragraphs.map((paragraph) => (
          <span
            key={paragraph}
            style={{ fontSize: 24, lineHeight: 1.42, marginTop: 12, flexShrink: 0 }}
          >
            {paragraph}
          </span>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          borderTop: "3px solid rgba(20, 19, 15, 0.15)",
          paddingTop: 20,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 24 }}>{letter.signOff}</span>
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            {GREENS.map((colour) => (
              <div
                key={colour}
                style={{ width: 18, height: 18, borderRadius: 4, background: colour }}
              />
            ))}
          </div>
        </div>
        <span style={{ fontSize: 24, fontWeight: 700 }}>
          {SLIDE_TITLES.length}/{SLIDE_TITLES.length}
        </span>
      </div>
    </div>,
    { ...SLIDE_SIZE, fonts: await cardFonts() },
  );
}

/**
 * Slide PNG bytes, cached per user, sync time and slide. The PDF and ZIP exports reuse them, so a
 * full export renders each slide once per recap version.
 */
export async function slidePng(
  userId: string,
  // Unused in the body on purpose: as an argument it is part of the cache key.
  _syncedAtIso: string,
  index: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
  "use cache";
  cacheLife("days");
  const [row] = await db
    .select({ data: recaps.data })
    .from(recaps)
    .where(and(eq(recaps.userId, userId), eq(recaps.year, EDITION_YEAR)));
  if (!row) return null;
  const data = toPublicRecap(row.data);
  const frame = LAST_FRAMES[index];
  if (frame !== undefined) {
    const png = await renderSceneStill(data, SLIDE_COMPOSITION, frame);
    return new Uint8Array(png);
  }
  const image = await renderLetter(data);
  return new Uint8Array(await image.arrayBuffer());
}

/** File name for a slide, e.g. wrapyourgit-2026-octo-08-archetype.png. */
export function slideFileName(year: number, login: string, index: number): string {
  const title = (SLIDE_TITLES[index] ?? "slide").toLowerCase();
  return `wrapyourgit-${year}-${login}-${String(index + 1).padStart(2, "0")}-${title}.png`;
}

/**
 * The export routes' answer when this server cannot render chapter frames: no Chrome or no WebGL,
 * e.g. on a serverless host (ADR-0011). Says so plainly instead of failing with a bare 500.
 */
export function slidesUnavailable(error: unknown): NextResponse {
  console.error(`slide render failed: ${errorSummary(error)}`);
  // The full error only in development: in production logs stay free of request data.
  if (process.env.NODE_ENV !== "production") console.error(error);
  return new NextResponse(
    "Slide exports can't be rendered on this server right now. Try again later.",
    { status: 503, headers: { "Retry-After": "300", "Cache-Control": "no-store" } },
  );
}
