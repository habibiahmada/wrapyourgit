/*
 * Spike (#147): draws one ride frame on an OffscreenCanvas, as RideStory + RideCanvas do (the
 * backdrop, the ground, the objects, rolled about the centre). The letter's sheet and the chrome
 * are DOM over the canvas in the real story and are left out here.
 */
import { VIDEO_FPS } from "@wyg/schema";
import {
  backdrop,
  buildRide,
  fontFamily,
  paintPrims,
  rideFrame,
  SKY,
  scenePrims,
} from "@wyg/video/ride-bench";
import { sampleRecap } from "@wyg/video/sample";

export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = VIDEO_FPS;

export type RideDrawer = {
  canvas: OffscreenCanvas;
  durationInFrames: number;
  /** Draws frame `i`; returns how long building the scene and painting it took (ms). */
  draw: (i: number) => { scene: number; paint: number };
};

export function createRideDrawer(images: ReadonlyMap<string, CanvasImageSource>): RideDrawer {
  const size = { width: WIDTH, height: HEIGHT };
  const model = buildRide(sampleRecap, size, "video", FPS, { letter: true });
  const canvas = new OffscreenCanvas(WIDTH, HEIGHT);
  const brush = canvas.getContext("2d");
  if (!brush) throw new Error("No 2D context on OffscreenCanvas");
  return {
    canvas,
    durationInFrames: model.timeline.durationInFrames,
    draw(i) {
      const t0 = performance.now();
      const { cam, roll, fog, ground, objects } = rideFrame(model, sampleRecap, i, size, FPS);
      const layers = [
        backdrop(cam, size, model.city, i),
        scenePrims(ground, cam, size, fog),
        scenePrims(objects, cam, size, fog),
      ];
      const t1 = performance.now();
      // The story's canvas sits on a SKY fill; a video frame has no page behind it.
      brush.fillStyle = SKY;
      brush.fillRect(0, 0, WIDTH, HEIGHT);
      brush.save();
      brush.translate(WIDTH / 2, HEIGHT / 2);
      brush.rotate((roll * Math.PI) / 180);
      brush.translate(-WIDTH / 2, -HEIGHT / 2);
      for (const prims of layers) {
        paintPrims(brush as unknown as CanvasRenderingContext2D, prims, { fontFamily, images });
      }
      brush.restore();
      return { scene: t1 - t0, paint: performance.now() - t1 };
    },
  };
}

/** The font's family name as the font loader gives it, without quotes. */
export const FONT_FAMILY = fontFamily.replace(/["']/g, "");
