import { AbsoluteFill } from "remotion";
import { fontFamily, palette } from "../theme";

/** Progress segments flush with the top and the copyright line, on every frame. */
export function Chrome({
  stops,
  current,
  year,
  frame,
}: {
  stops: number;
  current: number;
  year: number;
  frame: { width: number; height: number };
}) {
  // Sizes are specified at 1080 px on the shorter side, the size of every export format.
  const px = Math.min(frame.width, frame.height) / 1080;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ display: "flex", gap: 3 * px, height: 4 * px }}>
        {Array.from({ length: stops }, (_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional and never reorder
            key={i}
            style={{
              flex: 1,
              backgroundColor: i <= current ? palette.heat[2] : palette.ink,
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
          bottom: 40 * px,
          textAlign: "center",
          fontFamily,
          fontSize: 22 * px,
          color: palette.ink,
          opacity: 0.7,
        }}
      >
        © {year} WrapYourGit · wrapyourgit.habibiahmada.dev
      </div>
    </AbsoluteFill>
  );
}
