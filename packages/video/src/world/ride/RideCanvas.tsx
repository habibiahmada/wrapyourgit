import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDelayRender } from "remotion";
import { paintPrims } from "./paint";
import type { Prim } from "./prims";

const NO_IMAGES: ReadonlyMap<string, CanvasImageSource> = new Map();
/** The weights the scene prints in. */
const WEIGHTS = [400, 700, 800];

/**
 * A picture ready to draw. An SVG with a viewBox and no size of its own has no intrinsic size,
 * and not every browser draws such a picture on a canvas, so those are given one first.
 */
async function loadImage(href: string): Promise<CanvasImageSource> {
  let src = href;
  if (/\.svg($|\?)/.test(href)) {
    const text = await (await fetch(href)).text();
    const tag = text.match(/<svg[^>]*>/)?.[0] ?? "";
    const sized = /\swidth=/.test(tag)
      ? text
      : text.replace("<svg", '<svg width="256" height="256"');
    src = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }));
  }
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Could not load ${href}`));
    image.src = src;
  });
  return image;
}

/**
 * The scene as one canvas. Layers are painted in order, each already sorted far to near.
 *
 * A canvas does not repaint itself when a picture or a font arrives, as the page's own text and
 * images do. So a render is held until the logos and the font's faces are in, and each hold is
 * let go only after the layout effect that painted with them: no frame is captured before its
 * canvas is complete.
 */
export function RideCanvas({
  layers,
  width,
  height,
  fontFamily,
  logos,
  roll,
}: {
  layers: readonly (readonly Prim[])[];
  width: number;
  height: number;
  fontFamily: string;
  /** Every picture a primitive may name by its `href`. */
  logos: readonly string[];
  /** The scene turns about the frame's centre by this many degrees. */
  roll: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { delayRender, continueRender } = useDelayRender();
  const [images, setImages] = useState(NO_IMAGES);
  const [, repaint] = useState(0);
  /** Holds to let go once the canvas has been painted with what they waited for. */
  const painted = useRef<number[]>([]);

  const key = logos.join("\n");
  useEffect(() => {
    const wanted = key === "" ? [] : key.split("\n");
    if (wanted.length === 0) return;
    const handle = delayRender("Loading the ride's logos");
    let live = true;
    // A logo that fails to load is left off its block; the name is printed there as well.
    Promise.allSettled(wanted.map(loadImage)).then((results) => {
      if (!live) return;
      const loaded = new Map<string, CanvasImageSource>();
      results.forEach((result, i) => {
        const href = wanted[i];
        if (result.status === "fulfilled" && href) loaded.set(href, result.value);
      });
      painted.current.push(handle);
      setImages(loaded);
    });
    return () => {
      live = false;
      continueRender(handle);
    };
  }, [key, delayRender, continueRender]);

  useEffect(() => {
    const handle = delayRender("Loading the ride's font");
    let live = true;
    Promise.allSettled(
      WEIGHTS.map((weight) => document.fonts.load(`${weight} 100px ${fontFamily}`)),
    ).then(() => {
      if (!live) return;
      painted.current.push(handle);
      repaint((n) => n + 1);
    });
    return () => {
      live = false;
      continueRender(handle);
    };
  }, [fontFamily, delayRender, continueRender]);

  useLayoutEffect(() => {
    const brush = ref.current?.getContext("2d");
    if (!brush) return;
    brush.clearRect(0, 0, width, height);
    // The roll is part of the drawing, so the picture is not resampled afterwards. The backdrop
    // reaches far past the frame, so a rolled scene shows no corner.
    brush.save();
    brush.translate(width / 2, height / 2);
    brush.rotate((roll * Math.PI) / 180);
    brush.translate(-width / 2, -height / 2);
    for (const prims of layers) paintPrims(brush, prims, { fontFamily, images });
    brush.restore();
    for (const handle of painted.current.splice(0)) continueRender(handle);
  });

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      style={{ position: "absolute", inset: 0, width, height }}
      aria-hidden
    />
  );
}
