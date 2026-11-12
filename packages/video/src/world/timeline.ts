/*
 * The timeline's shape, shared by the ride's own (ride/timeline.ts), the web player and the
 * sounds: where each stop rests and how long the move into it takes.
 */

export type WorldMode = "interactive" | "video";

export type Timeline = {
  /** Frame where the camera rests on stop i (in video mode, where its hold begins). */
  stopFrames: number[];
  /** Length of the move from stop i - 1 to stop i; 0 for the first stop. */
  moveFrames: number[];
  /**
   * True where stop i sits on the same place as stop i - 1 (the letter's pages): nothing travels,
   * so the move is a page turn.
   */
  inPlace?: boolean[];
  durationInFrames: number;
};

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
