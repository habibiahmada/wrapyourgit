import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { useLayout } from "../layout";
import { type FieldColor, fontFamily, palette, textOn } from "../theme";

/**
 * A scene's flat color field with its content box. On portrait the box keeps text inside the
 * central 80% of the height, clear of the TikTok/Reels overlays (scene-system rule 3).
 */
export function Field({
  color,
  children,
  style,
}: {
  color: FieldColor;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const { width, height } = useVideoConfig();
  const layout = useLayout();
  const padY = height * (layout === "portrait" ? 0.1 : 0.08);
  const padX = width * (layout === "landscape" ? 0.06 : 0.08);

  return (
    <AbsoluteFill style={{ background: palette[color], color: textOn[color], fontFamily }}>
      <AbsoluteFill
        style={{
          top: padY,
          bottom: padY,
          left: padX,
          right: padX,
          width: "auto",
          height: "auto",
          display: "flex",
          ...style,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
