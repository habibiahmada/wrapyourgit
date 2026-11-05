import { interpolate } from "remotion";
import { easeOut } from "../theme";

/**
 * Frames on which a count-up from 0 to `value` (frames `from` to `to`, same easing as
 * useCountUp) shows a new number: one tick per visible change, at most one every `minGap`
 * frames so a five-digit count is a rattle, not a buzz.
 */
export function tickFrames(value: number, from: number, to: number, minGap = 2): number[] {
  const frames: number[] = [];
  let shown = 0;
  for (let frame = from; frame <= to; frame++) {
    const current = Math.round(
      interpolate(frame, [from, to], [0, value], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: easeOut,
      }),
    );
    if (current === shown) continue;
    shown = current;
    const last = frames.at(-1);
    if (last === undefined || frame - last >= minGap) frames.push(frame);
  }
  return frames;
}
