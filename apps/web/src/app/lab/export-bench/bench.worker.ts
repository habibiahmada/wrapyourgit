/*
 * Spike (#147): the benchmark's drawing worker. The stub must be the first import, so it runs
 * before the ride's modules are evaluated.
 */
import "./worker-stub";
import { createRideDrawer, FONT_FAMILY, FPS, type RideDrawer } from "./ride-draw";

export type ToWorker =
  | { type: "init"; images: [string, ImageBitmap][] }
  | { type: "paint"; frames: number[] }
  | { type: "draw"; seq: number; i: number };

export type FromWorker =
  | { type: "ready"; durationInFrames: number; font: string; initMs: number }
  | { type: "paint-result"; scene: number[]; paint: number[]; snap: number[]; wallMs: number }
  | { type: "frame"; seq: number; frame: VideoFrame; scene: number; paint: number }
  | { type: "error"; message: string };

const post = (message: FromWorker, transfer: Transferable[] = []) =>
  (self as unknown as Worker).postMessage(message, transfer);

let drawer: RideDrawer | null = null;

async function waitForFont(): Promise<string> {
  const fonts = (globalThis as unknown as { fonts?: FontFaceSet }).fonts;
  if (!fonts) return "fallback (no FontFaceSet in worker)";
  const end = performance.now() + 8000;
  while (performance.now() < end) {
    const faces: FontFace[] = [];
    fonts.forEach((face) => {
      if (face.family.replace(/["']/g, "") === FONT_FAMILY) faces.push(face);
    });
    if (faces.length >= 3 && faces.every((face) => face.status === "loaded")) {
      return `${faces.length} faces loaded`;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return "fallback (font not loaded in 8 s)";
}

function need(): RideDrawer {
  if (!drawer) throw new Error("Worker not initialised");
  return drawer;
}

self.onmessage = async (event: MessageEvent<ToWorker>) => {
  const msg = event.data;
  try {
    if (msg.type === "init") {
      const t0 = performance.now();
      const font = await waitForFont();
      drawer = createRideDrawer(new Map(msg.images));
      // One untimed frame, so the first timed one does not pay for warming up.
      drawer.draw(0);
      post({
        type: "ready",
        durationInFrames: drawer.durationInFrames,
        font,
        initMs: performance.now() - t0,
      });
    } else if (msg.type === "paint") {
      const d = need();
      const scene: number[] = [];
      const paint: number[] = [];
      const snap: number[] = [];
      const t0 = performance.now();
      for (const i of msg.frames) {
        const t = d.draw(i);
        scene.push(t.scene);
        paint.push(t.paint);
        // Taking the frame is what the real pipeline does next; it makes the canvas flush.
        const s0 = performance.now();
        new VideoFrame(d.canvas, { timestamp: 0 }).close();
        snap.push(performance.now() - s0);
      }
      post({ type: "paint-result", scene, paint, snap, wallMs: performance.now() - t0 });
    } else if (msg.type === "draw") {
      const d = need();
      const t = d.draw(msg.i);
      const frame = new VideoFrame(d.canvas, {
        timestamp: Math.round((msg.seq * 1_000_000) / FPS),
        duration: Math.round(1_000_000 / FPS),
      });
      post({ type: "frame", seq: msg.seq, frame, scene: t.scene, paint: t.paint }, [frame]);
    }
  } catch (error) {
    post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
