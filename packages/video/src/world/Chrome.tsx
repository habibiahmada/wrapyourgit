import { AbsoluteFill } from "remotion";
import { fontFamily, palette } from "../theme";
import {
  CHROME_REF,
  FOOTER_BOTTOM,
  FOOTER_SIZE,
  PROGRESS_GAP,
  PROGRESS_HEIGHT,
} from "./chrome-size";
import { chromeInk } from "./chrome-tone";

/** Progress segments flush with the top and the copyright line, on every frame. */
export function Chrome({
  stops,
  current,
  year,
  frame,
  darkness = 0,
}: {
  stops: number;
  current: number;
  year: number;
  frame: { width: number; height: number };
  /** 0 over light scenes, 1 over night ones; see chromeDarkness. */
  darkness?: number;
}) {
  const ink = chromeInk(darkness);
  const px = Math.min(frame.width, frame.height) / CHROME_REF;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ display: "flex", gap: PROGRESS_GAP * px, height: PROGRESS_HEIGHT * px }}>
        {Array.from({ length: stops }, (_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional and never reorder
            key={i}
            style={{
              flex: 1,
              backgroundColor: i <= current ? palette.heat[2] : ink,
              opacity: i <= current ? 1 : 0.18,
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: FOOTER_BOTTOM * px,
          textAlign: "center",
          fontFamily,
          fontSize: FOOTER_SIZE * px,
          color: ink,
          opacity: 0.7,
        }}
      >
        © {year} WrapYourGit · wrapyourgit.habibiahmada.dev
      </div>
    </AbsoluteFill>
  );
}
