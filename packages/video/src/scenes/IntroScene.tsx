import type { RecapData } from "@wyg/schema";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useLayout } from "../layout";
import { theme } from "../theme";

export function IntroScene({ data }: { data: RecapData }) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const layout = useLayout();
  const reveal = spring({ frame, fps, config: { damping: 200 } });
  const titleSize = width * (layout === "landscape" ? 0.07 : 0.11);

  return (
    <AbsoluteFill
      style={{
        background: theme.background,
        color: theme.foreground,
        fontFamily: theme.fontSans,
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          opacity: reveal,
          transform: `translateY(${interpolate(reveal, [0, 1], [40, 0])}px)`,
        }}
      >
        <div style={{ fontFamily: theme.fontMono, color: theme.muted, fontSize: titleSize * 0.22 }}>
          @{data.profile.login} · {data.meta.year}
        </div>
        <div style={{ fontSize: titleSize, fontWeight: 700, lineHeight: 1.05 }}>
          Your year
          <br />
          in code.
        </div>
      </div>
    </AbsoluteFill>
  );
}
