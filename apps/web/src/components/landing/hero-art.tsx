import { sampleRecap } from "@wyg/video/sample";
import { Art } from "@/components/art";
import { heroScene, linePath } from "./hero-scene";
import { iso, type Vec } from "./iso";
import { IsoArt } from "./iso-art";

/** Built once per server: the sample recap never changes between requests. */
const SCENE = heroScene(sampleRecap);
const [VX = 0, VY = 0, VW = 1, VH = 1] = SCENE.viewBox.split(" ").map(Number);

/** A five-point star centred on a screen point, `r` units across. */
function star([cx, cy]: [number, number], r: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + radius * Math.cos(angle)).toFixed(3)},${(cy + radius * Math.sin(angle)).toFixed(3)}`;
  }).join(" ");
}

/** The envelope's flap, drawn on its module's top face in the same projection. */
function flap([x, y, z]: Vec): string {
  const corners: Vec[] = [
    [x - 1.2, y - 0.85, z],
    [x, y + 0.1, z],
    [x + 1.2, y - 0.85, z],
  ];
  return `M${corners
    .map(iso)
    .map(([a, b]) => `${a.toFixed(3)} ${b.toFixed(3)}`)
    .join("L")}`;
}

/**
 * The hero illustration: a quarter of a sample year as a city on a slab, the busiest day lit
 * with Cell on its roof, and three linked modules for the chapters that follow: languages,
 * stars and the letter. Inline SVG, drawn on the server; it rises once on load.
 */
export function HeroArt({ className }: { className?: string }) {
  const { busiest, links, modules } = SCENE;
  const stars = modules.find((m) => m.kind === "stars");
  const letter = modules.find((m) => m.kind === "letter");
  const glowAt = busiest ? iso([busiest[0], busiest[1], 0]) : null;
  return (
    <figure className={className}>
      <div className="relative">
        <IsoArt
          boxes={SCENE.boxes}
          viewBox={SCENE.viewBox}
          rise
          label="Illustration: a quarter of a sample year drawn as a city on a slab, its busiest day lit green, linked to small blocks for languages, stars and a letter."
          className="block h-auto w-full overflow-visible"
          before={
            <>
              <defs>
                <radialGradient id="hero-glow">
                  <stop offset="0" stopColor="#39d353" stopOpacity="0.4" />
                  <stop offset="1" stopColor="#39d353" stopOpacity="0" />
                </radialGradient>
              </defs>
              {glowAt && (
                <ellipse
                  className="iso-late"
                  cx={glowAt[0]}
                  cy={glowAt[1]}
                  rx="4.2"
                  ry="2.4"
                  fill="url(#hero-glow)"
                />
              )}
              {links.map(({ from, to }) => (
                <path
                  key={`${from.join()}-${to.join()}`}
                  d={linePath(from, to)}
                  fill="none"
                  stroke="#30363d"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </>
          }
          after={
            <g className="iso-late">
              {stars && (
                <polygon
                  points={star(iso([stars.top[0], stars.top[1], stars.top[2] + 0.9]), 0.75)}
                  fill="#39d353"
                />
              )}
              {letter && (
                <path
                  d={flap(letter.top)}
                  fill="none"
                  stroke="#39d353"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </g>
          }
        />
        {busiest && (
          // Feet on the busiest roof: the art's feet sit about 85% down the image.
          <div
            className="iso-late pointer-events-none absolute w-[15%] -translate-x-1/2 -translate-y-[85%]"
            style={{
              left: `${((iso(busiest)[0] - VX) / VW) * 100}%`,
              top: `${((iso(busiest)[1] - VY) / VH) * 100}%`,
            }}
          >
            <Art id="cutout-cell-cheer" alt="" priority className="h-auto w-full" />
          </div>
        )}
      </div>
    </figure>
  );
}
