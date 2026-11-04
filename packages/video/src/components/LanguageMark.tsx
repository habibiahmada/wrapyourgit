import { Img, staticFile } from "remotion";
import { languageIcon, languageInitials } from "../languages";
import { palette } from "../theme";

/**
 * A language's logo on a paper sticker with an ink rim, so every logo reads on every field (some
 * are black, some are cobalt). Languages without a logo get their initials in the language's
 * GitHub colour instead. Decorative: the name is always written beside it.
 */
export function LanguageMark({
  name,
  color,
  size,
}: {
  name: string;
  color: string | null;
  size: number;
}) {
  const icon = languageIcon(name);
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: size * 0.22,
        background: palette.paper,
        border: `${Math.max(2, size * 0.06)}px solid ${palette.ink}`,
        boxShadow: `${size * 0.06}px ${size * 0.06}px 0 ${palette.ink}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {icon ? (
        <Img src={staticFile(icon)} style={{ width: "72%", height: "72%", objectFit: "contain" }} />
      ) : (
        <span
          style={{
            fontSize: size * 0.42,
            fontWeight: 800,
            color: color ?? palette.ink,
            WebkitTextStroke: `${Math.max(1, size * 0.015)}px ${palette.ink}`,
          }}
        >
          {languageInitials(name)}
        </span>
      )}
    </div>
  );
}
