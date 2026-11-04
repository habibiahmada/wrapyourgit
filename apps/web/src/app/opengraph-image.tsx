import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { CARD_SIZE, cardFonts } from "@/server/card";

export const alt =
  "WrapYourGit: every green square has a story. Cell and friends in front of a contribution graph.";
export const size = CARD_SIZE;
export const contentType = "image/png";

/** The share image for the landing page: the headline and the hero cast, on ink. */
export default async function OpenGraphImage() {
  const [fonts, cast] = await Promise.all([
    cardFonts(),
    readFile(join(process.cwd(), "public/art/hero-cast.png")).then(
      (bytes) => `data:image/png;base64,${bytes.toString("base64")}`,
    ),
  ]);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#0d1117",
        color: "#e6edf3",
        fontFamily: "Bricolage",
        padding: 64,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", width: 600, zIndex: 1 }}>
        <span style={{ fontSize: 32, fontWeight: 700 }}>WrapYourGit 2026</span>
        <span style={{ fontSize: 84, fontWeight: 800, lineHeight: 0.95, marginTop: 40 }}>
          Every green square has a story.
        </span>
        <span style={{ fontSize: 34, fontWeight: 700, color: "#3fb950", marginTop: 24 }}>
          Here is yours, in motion.
        </span>
      </div>
      {/* biome-ignore lint/performance/noImgElement: Satori renders plain img only */}
      <img
        src={cast}
        width={720}
        height={540}
        alt=""
        style={{ position: "absolute", right: -40, bottom: -20 }}
      />
    </div>,
    { ...size, fonts },
  );
}
