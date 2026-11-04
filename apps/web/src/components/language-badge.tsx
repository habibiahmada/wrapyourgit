import { languageIcon, languageInitials } from "@wyg/video/languages";
import Image from "next/image";

/** Ink or paper text, whichever reads better on the language's colour (WCAG relative luminance). */
function textOn(hex: string): string {
  const channel = (i: number) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return luminance > 0.18 ? "#14130F" : "#F4EFE3";
}

/**
 * A language's logo (Devicon, see public/lang/LICENSES.md), or a badge in its GitHub colour with
 * its initials when there is no logo. Decorative: the language name is always written next to it.
 */
export function LanguageBadge({
  name,
  color,
  size = 40,
}: {
  name: string;
  color: string | null;
  size?: number;
}) {
  const icon = languageIcon(name);
  if (icon) {
    return (
      <Image
        src={`/${icon}`}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  const background = color ?? "#5C584E";
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-[6px] font-extrabold"
      style={{
        width: size,
        height: size,
        background,
        color: textOn(background),
        fontSize: size * 0.4,
      }}
    >
      {languageInitials(name)}
    </span>
  );
}
