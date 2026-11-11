import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDelayRender } from "remotion";
import { paintPrims } from "./paint";
import type { Prim } from "./prims";

const NO_IMAGES: ReadonlyMap<string, CanvasImageSource> = new Map();

/** The pictures at `hrefs`, once they have loaded. A render waits for them. */
function useImages(hrefs: readonly string[]): ReadonlyMap<string, CanvasImageSource> {
  const { delayRender, continueRender } = useDelayRender();
  const [images, setImages] = useState(NO_IMAGES);
  const key = hrefs.join("\n");
  useEffect(() => {
    const wanted = key === "" ? [] : key.split("\n");
    if (wanted.length === 0) return;
    const handle = delayRender("Loading the ride's logos");
    let live = true;
    const loaded = new Map<string, CanvasImageSource>();
    let left = wanted.length;
    const settle = () => {
      left -= 1;
      if (left > 0 || !live) return;
      setImages(loaded);
      continueRender(handle);
    };
    for (const href of wanted) {
      const image = new Image();
      image.onload = () => {
        loaded.set(href, image);
        settle();
      };
      // A logo that fails to load is left off its block; the name is printed there as well.
      image.onerror = settle;
      image.src = href;
    }
    return () => {
      live = false;
      continueRender(handle);
    };
  }, [key, delayRender, continueRender]);
  return images;
}

/**
 * The scene as one canvas. Layers are painted in order, each already sorted far to near. The
 * canvas is drawn in a layout effect, so it is complete before a frame is captured.
 */
export function RideCanvas({
  layers,
  width,
  height,
  fontFamily,
  logos,
  roll,
  zoom,
}: {
  layers: readonly (readonly Prim[])[];
  width: number;
  height: number;
  fontFamily: string;
  /** Every picture a primitive may name by its `href`. */
  logos: readonly string[];
  /** The scene turns about the frame's centre by this many degrees, and grows by `zoom`. */
  roll: number;
  zoom: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const images = useImages(logos);
  useLayoutEffect(() => {
    const brush = ref.current?.getContext("2d");
    if (!brush) return;
    brush.clearRect(0, 0, width, height);
    // The roll and the zoom are part of the drawing, so the picture is not resampled afterwards.
    brush.save();
    brush.translate(width / 2, height / 2);
    brush.rotate((roll * Math.PI) / 180);
    brush.scale(zoom, zoom);
    brush.translate(-width / 2, -height / 2);
    for (const prims of layers) paintPrims(brush, prims, { fontFamily, images });
    brush.restore();
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
