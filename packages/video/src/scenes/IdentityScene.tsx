import type { RecapData } from "@wyg/schema";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { beats } from "../audio/track";
import { Field } from "../components/Field";
import { Slam } from "../components/Slam";
import { ARCHETYPE_LABELS, NO_ARCHETYPE } from "../copy";
import { fitFontSize } from "../heat";
import { useLayout } from "../layout";
import { runnerUps } from "../present";
import { palette, useUnit } from "../theme";

/**
 * Persimmon field, ink text. The climax: it starts on the track's climax beat, the archetype
 * lands on beat 2 with a heavier spring than other scenes, and its evidence follows. No
 * archetype is an honest result with its own line, never a forced label.
 */
export function IdentityScene({ data }: { data: RecapData }) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const layout = useLayout();
  const u = useUnit();
  const { archetype, reasons } = data.identity;
  // Everyone gets one archetype; runner-ups show the other sides of their year.
  const also = archetype ? runnerUps(data.identity) : [];
  const title = archetype ? ARCHETYPE_LABELS[archetype] : NO_ARCHETYPE;
  // A label is one word and fills the line; the no-archetype sentence wraps at a fixed size.
  const titleSize = archetype
    ? fitFontSize(title, width * (layout === "landscape" ? 0.86 : 0.84), u * 28, 0.66)
    : u * (layout === "landscape" ? 11 : 13);
  // Overshoots a little then settles: the one place the story allows a bigger gesture.
  const reveal = spring({
    frame: frame - beats(2, fps),
    fps,
    config: { damping: 9, stiffness: 120, mass: 0.8 },
  });

  return (
    <Field
      color="persimmon"
      style={{ flexDirection: "column", justifyContent: "center", gap: u * 4 }}
    >
      <Slam at={0}>
        <div style={{ fontSize: u * 5, fontWeight: 700 }}>your {data.meta.year} archetype</div>
      </Slam>
      <div style={{ display: "flex", alignItems: "center", gap: u * 3 }}>
        <div
          style={{
            fontSize: titleSize,
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: "-0.03em",
            whiteSpace: archetype ? "nowrap" : "normal",
            maxWidth: u * 90,
            transform: `scale(${0.6 + 0.4 * reveal})`,
            transformOrigin: "left center",
            opacity: Math.min(1, reveal * 2),
          }}
        >
          {title}
        </div>
      </div>
      <div
        style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: u * 2 }}
      >
        {reasons.map((reason, index) => (
          <Slam key={reason} at={beats(6 + index * 2, fps)} from="left">
            <div
              style={{
                background: palette.ink,
                color: palette.paper,
                fontSize: u * (layout === "landscape" ? 4.6 : 5),
                fontWeight: 700,
                padding: `${u * 1.4}px ${u * 2.6}px`,
                borderRadius: u * 0.8,
                display: "flex",
                alignItems: "center",
                gap: u * 2,
              }}
            >
              <span
                style={{
                  width: u * 3.5,
                  height: u * 3.5,
                  borderRadius: u * 0.5,
                  background: palette.cell,
                  flexShrink: 0,
                }}
              />
              {reason}
            </div>
          </Slam>
        ))}
        {also.length > 0 && (
          <Slam at={beats(6 + reasons.length * 2, fps)} from="left">
            <div style={{ fontSize: u * (layout === "landscape" ? 4 : 4.4), fontWeight: 700 }}>
              also part {also.map((id) => ARCHETYPE_LABELS[id]).join(" and part ")}
            </div>
          </Slam>
        )}
      </div>
    </Field>
  );
}
