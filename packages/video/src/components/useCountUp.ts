import { interpolate, useCurrentFrame } from "remotion";
import { easeOut } from "../theme";

/**
 * Counts from 0 to `value` between frames `from` and `to`, then holds. Callers place `to` early
 * enough that the final value stays on screen for at least 1.5 s (scene-system rule 4).
 */
export function useCountUp(value: number, from: number, to: number): number {
  const frame = useCurrentFrame();
  return Math.round(
    interpolate(frame, [from, to], [0, value], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: easeOut,
    }),
  );
}
