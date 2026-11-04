import { type LayoutFamily, layoutForSize } from "@wyg/schema";
import { useVideoConfig } from "remotion";

/** Layout family of the current composition. Scenes branch on this, never on raw ratios. */
export function useLayout(): LayoutFamily {
  const { width, height } = useVideoConfig();
  return layoutForSize(width, height);
}
