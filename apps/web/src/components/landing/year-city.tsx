import { sampleRecap } from "@wyg/video/sample";
import type { CSSProperties } from "react";
import { Art } from "@/components/art";
import { cityPaths } from "./city-paths";

/** Built once per server: the sample recap never changes between requests. */
const CITY = cityPaths(sampleRecap);
const [VX = 0, VY = 0, VW = 1, VH = 1] = CITY.viewBox.split(" ").map(Number);
/** Spread of the week-by-week rise, in ms; the glow and Cell follow it. */
const RISE_MS = 1200;

/**
 * A whole sample year's contribution graph as an isometric city, the same one the story opens
 * on; the landing page closes on it. Drawn on the server as one SVG; only the busiest day is lit
 * (the page's single glow, DESIGN.md "Web"), and Cell stands on its roof.
 */
export function YearCity({ className }: { className?: string }) {
  const { busiest } = CITY;
  const lastCol = CITY.weeks.at(-1)?.col ?? 1;
  return (
    <figure className={className}>
      <div className="relative">
        <svg
          viewBox={CITY.viewBox}
          role="img"
          aria-label="Illustration: a year of contributions drawn as a city, one building per day, from a sample recap."
          className="block h-auto w-full overflow-visible"
        >
          <defs>
            <radialGradient id="year-city-glow">
              <stop offset="0" stopColor="#39d353" stopOpacity="0.45" />
              <stop offset="1" stopColor="#39d353" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path
            d={CITY.ground}
            fill="none"
            stroke="#30363d"
            strokeWidth="0.75"
            vectorEffect="non-scaling-stroke"
          />
          {busiest && (
            <ellipse
              className="year-city-late"
              cx={busiest.x}
              cy={busiest.y + 1.2}
              rx="6"
              ry="3.6"
              fill="url(#year-city-glow)"
            />
          )}
          {CITY.weeks.map(({ col, buildings }) => (
            <g
              key={col}
              className="year-city-week"
              style={{ "--delay": `${Math.round((col / lastCol) * RISE_MS)}ms` } as CSSProperties}
            >
              {buildings.map((b) => (
                // Line art: hairline edges on dark sides, the day's green on the roof.
                <g key={b.date} stroke="#30363d" strokeWidth="0.6" strokeLinejoin="round">
                  <path d={b.left} fill={b.leftFill} vectorEffect="non-scaling-stroke" />
                  <path d={b.right} fill={b.rightFill} vectorEffect="non-scaling-stroke" />
                  <path d={b.roof} fill={b.top} vectorEffect="non-scaling-stroke" />
                </g>
              ))}
            </g>
          ))}
        </svg>
        {busiest && (
          // Feet on the busiest roof: the art's feet sit about 85% down the image.
          <div
            className="year-city-late pointer-events-none absolute w-[17%] -translate-x-1/2 -translate-y-[85%]"
            style={{
              left: `${((busiest.x - VX) / VW) * 100}%`,
              top: `${((busiest.y - VY) / VH) * 100}%`,
            }}
          >
            <Art id="cutout-cell-proud" alt="" className="h-auto w-full" />
          </div>
        )}
      </div>
      <figcaption className="mt-3 text-right text-sm text-muted">A whole sample year</figcaption>
    </figure>
  );
}
