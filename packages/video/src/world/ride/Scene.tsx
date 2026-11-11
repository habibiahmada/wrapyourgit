import type { ReactNode } from "react";
import type { Prim } from "./prims";

const points = (pts: readonly [number, number][]) =>
  pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/**
 * Paints primitives in the order given (scenePrims returns them far to near), as SVG elements for
 * inside an <svg>. Everything here is something @remotion/web-renderer can draw (ADR-0016): plain
 * polygons, circles, images and SVG text under a 2D matrix.
 */
export function RideScene({ prims }: { prims: readonly Prim[] }): ReactNode {
  return prims.map((p, i) => {
    // Primitives have no identity of their own: the list is rebuilt whole on every frame.
    const key = i;
    switch (p.kind) {
      case "poly":
        return (
          <polygon
            key={key}
            points={points(p.pts)}
            fill={p.fill ?? "none"}
            stroke={p.stroke ?? "none"}
            strokeWidth={1}
            strokeLinejoin="round"
          />
        );
      case "circle":
        return <circle key={key} cx={p.x} cy={p.y} r={p.r} fill={p.fill} opacity={p.opacity} />;
      case "image":
        return (
          <image
            key={key}
            href={p.href}
            width={1}
            height={1}
            transform={`matrix(${p.matrix.join(" ")})`}
          />
        );
      case "text":
        return (
          <text
            key={key}
            transform={`matrix(${p.matrix.join(" ")})`}
            x={p.x}
            y={p.y}
            fontSize={p.size}
            fontWeight={p.weight}
            fill={p.fill}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {p.text}
          </text>
        );
      default: {
        const unreachable: never = p;
        return unreachable;
      }
    }
  });
}
