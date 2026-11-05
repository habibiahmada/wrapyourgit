import { Img, staticFile } from "remotion";
import { type PhotoId, photoPath } from "../photos";

/**
 * A photo printed like a snapshot: paper border, a slight tilt and a slow push-in driven by `t`
 * (seconds), so it stays deterministic in every render. Sits behind Cell, whose feet overlap the
 * bottom edge so the character stands in front of the place rather than inside a frame.
 */
export function PhotoCard({
  photo,
  width,
  height,
  tilt = 0,
  t = 0,
}: {
  photo: PhotoId;
  width: number;
  height: number;
  /** Degrees. */
  tilt?: number;
  t?: number;
}) {
  const border = Math.max(4, Math.round(width * 0.03));
  // About 6% larger over ten seconds: enough to feel alive, never enough to crop the subject.
  const zoom = 1 + Math.min(t, 10) * 0.006;
  return (
    <div
      style={{
        width,
        height,
        padding: border,
        background: "#F4EFE3",
        borderRadius: border * 0.8,
        transform: `rotate(${tilt}deg)`,
        // The one lifted surface in the scene: the print sits on the field.
        boxShadow: `0 ${border}px ${border * 3}px rgba(20, 19, 15, 0.35)`,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
          borderRadius: border * 0.4,
        }}
      >
        <Img
          src={staticFile(photoPath(photo))}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${zoom})`,
          }}
        />
      </div>
    </div>
  );
}
