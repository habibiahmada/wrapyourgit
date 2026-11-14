/*
 * Paints the ride's primitives onto a canvas. The scene is a few thousand shapes that are rebuilt
 * on every frame; as SVG elements, @remotion/web-renderer has to write the whole <svg> out as
 * text and load it back as an image for each frame, which made the ride's export several times
 * slower than the story it replaces. A canvas is drawn by the renderer as it is.
 */
import type { Prim } from "./prims";

/** The part of a canvas 2D context the painter uses. */
export type Brush = Pick<
  CanvasRenderingContext2D,
  | "save"
  | "restore"
  | "beginPath"
  | "closePath"
  | "moveTo"
  | "lineTo"
  | "arc"
  | "fill"
  | "stroke"
  | "transform"
  | "fillText"
  | "drawImage"
  | "fillStyle"
  | "strokeStyle"
  | "globalAlpha"
  | "font"
  | "lineWidth"
  | "lineJoin"
  | "textAlign"
  | "textBaseline"
>;

export type PaintExtras = {
  fontFamily: string;
  /** Loaded pictures by the `href` their primitives carry. One that is missing is not drawn. */
  images: ReadonlyMap<string, CanvasImageSource>;
};

/**
 * Text is set at this size and scaled down to its size in world units: browsers round or refuse
 * the sub-pixel font sizes a face's matrix would otherwise need.
 */
const FONT_PX = 100;

/** Paints `prims` in the order given (scenePrims returns them far to near). */
export function paintPrims(brush: Brush, prims: readonly Prim[], extras: PaintExtras): void {
  brush.lineWidth = 1;
  brush.lineJoin = "round";
  brush.textAlign = "center";
  brush.textBaseline = "middle";
  // A canvas parses every colour and font it is given, even the one it already holds; a frame has
  // about 1,400 shapes, most in a run of the same colour (issue #141). These remember what was
  // last set outside a save/restore, so it is set only when it changes.
  let fill: string | null = null;
  let stroke: string | null = null;
  let font: string | null = null;
  const fillWith = (colour: string) => {
    if (colour !== fill) brush.fillStyle = fill = colour;
  };
  for (const p of prims) {
    switch (p.kind) {
      case "poly": {
        brush.beginPath();
        p.pts.forEach(([x, y], i) => {
          if (i === 0) brush.moveTo(x, y);
          else brush.lineTo(x, y);
        });
        brush.closePath();
        if (p.fill) {
          fillWith(p.fill);
          brush.fill();
        }
        if (p.stroke) {
          if (p.stroke !== stroke) brush.strokeStyle = stroke = p.stroke;
          brush.stroke();
        }
        break;
      }
      case "circle": {
        brush.globalAlpha = p.opacity;
        fillWith(p.fill);
        brush.beginPath();
        brush.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        brush.fill();
        brush.globalAlpha = 1;
        break;
      }
      case "image": {
        const image = extras.images.get(p.href);
        if (!image) break;
        brush.save();
        brush.transform(...p.matrix);
        brush.drawImage(image, 0, 0, 1, 1);
        brush.restore();
        break;
      }
      case "text": {
        const scale = p.size / FONT_PX;
        // Set before save, so restore keeps them and the next text in the same face skips it.
        const face = `${p.weight} ${FONT_PX}px ${extras.fontFamily}, sans-serif`;
        if (face !== font) brush.font = font = face;
        fillWith(p.fill);
        brush.save();
        brush.transform(...p.matrix);
        brush.transform(scale, 0, 0, scale, 0, 0);
        brush.fillText(p.text, (p.x * FONT_PX) / p.size, (p.y * FONT_PX) / p.size);
        brush.restore();
        break;
      }
      default:
        p satisfies never;
    }
  }
}
