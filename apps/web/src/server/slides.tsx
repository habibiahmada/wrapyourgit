import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { toPublicRecap } from "@wyg/analytics";
import { renderSceneStill } from "@wyg/renderer/still";
import { EDITION_YEAR, type RecapData } from "@wyg/schema";
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
 * the story plays (`wrap-4x5`, 1080 × 1350), so an export looks exactly like the story, live 3D
 * cast included (ADR-0011). Slide 10 is the letter, which lives on the web page rather than in
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

/** The letter slide, in the story's letter design: paper, Cell proud, the full text. */
async function renderLetter(data: RecapData): Promise<ImageResponse> {
  const letter = congratsLetter(data);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: PAPER,
        color: INK,
        padding: "80px 84px",
        fontFamily: "Bricolage",
      }}
    >
      <div
        style={{ display: "flex", justifyContent: "space-between", fontSize: 30, fontWeight: 700 }}
      >
        <span>
          @{data.profile.login} · {data.meta.year}
        </span>
        <span>
          {SLIDE_TITLES.length}/{SLIDE_TITLES.length}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
        <img
          src={await art("cutout-cell-proud")}
          width={320}
          height={240}
          style={{ alignSelf: "flex-end", flexShrink: 0 }}
          alt=""
        />
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
        <span style={{ fontSize: 28, fontWeight: 700, marginTop: 22, flexShrink: 0 }}>
          {letter.signOff}
        </span>
      </div>
      <div style={{ display: "flex", fontSize: 26, fontWeight: 700 }}>WrapYourGit</div>
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
