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
 * Isometric wall & floor grid lines extending behind the hero city slab so the city sits inside
 * a 3D isometric chamber with glowing laser rays reaching the walls.
 */
function heroWallLines(): { grid: string[]; beams: string[]; corners: [number, number][] } {
  const grid: string[] = [];
  const beams: string[] = [];
  const corners: [number, number][] = [];
  const wallX = -2.2;
  const wallY = -2.2;
  const maxX = 16;
  const maxY = 10;
  const maxZ = 7.5;

  const seg = (a: Vec, b: Vec) => {
    const [ax, ay] = iso(a);
    const [bx, by] = iso(b);
    return `M${ax.toFixed(2)} ${ay.toFixed(2)}L${bx.toFixed(2)} ${by.toFixed(2)}`;
  };

  for (let x = wallX; x <= maxX; x += 2) {
    grid.push(seg([x, wallY, -1.3], [x, wallY, maxZ]));
  }
  for (let z = -1.3; z <= maxZ; z += 1.5) {
    grid.push(seg([wallX, wallY, z], [maxX, wallY, z]));
    grid.push(seg([wallX, wallY, z], [wallX, maxY, z]));
  }
  // From the second: the corner's own upright is already there, from the wall beside it.
  for (let y = wallY + 2; y <= maxY; y += 2) {
    grid.push(seg([wallX, y, -1.3], [wallX, y, maxZ]));
  }

  beams.push(seg([wallX, wallY, -1.3], [wallX, wallY, maxZ]));
  beams.push(seg([wallX, wallY, -1.3], [maxX, wallY, -1.3]));
  beams.push(seg([wallX, wallY, -1.3], [wallX, maxY, -1.3]));

  corners.push(iso([wallX, wallY, maxZ]), iso([4, wallY, 3.2]), iso([wallX, 3.8, 3.2]));
  return { grid, beams, corners };
}

const WALLS = heroWallLines();

/**
 * The hero illustration: a quarter of a sample year as a city on a slab, the busiest day lit
 * with Cell on its roof, isometric walls rising behind it, and three floating glass HUD cards
 * showing real facts from `sampleRecap`. Inline SVG, drawn on the server.
 */
export function HeroArt({ className }: { className?: string }) {
  const { busiest, links, modules } = SCENE;
  const stars = modules.find((m) => m.kind === "stars");
  const letter = modules.find((m) => m.kind === "letter");
  const glowAt = busiest ? iso([busiest[0], busiest[1], 0]) : null;
  const topLang = sampleRecap.languages.top[0];

  return (
    <figure className={className}>
      <div className="relative">
        {/* Ambient multi-layered light behind the city */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -m-8 rounded-full opacity-75 blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 52% 45%, rgba(57,211,83,0.22) 0%, rgba(68,147,248,0.10) 45%, transparent 72%)",
          }}
        />

        <IsoArt
          boxes={SCENE.boxes}
          viewBox={SCENE.viewBox}
          rise
          label="Illustration: a quarter of a sample year drawn as a city on a slab with lit windows, streets, cars and trees round it, its busiest day lit green, linked to small blocks for languages, stars and a letter."
          className="relative z-10 block h-auto w-full overflow-visible"
          before={
            <>
              <defs>
                <radialGradient id="hero-glow">
                  <stop offset="0" stopColor="#39d353" stopOpacity="0.55" />
                  <stop offset="0.5" stopColor="#26a641" stopOpacity="0.18" />
                  <stop offset="1" stopColor="#39d353" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="wall-beam" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0" stopColor="#39d353" stopOpacity="0.65" />
                  <stop offset="1" stopColor="#4493f8" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Isometric chamber walls behind the city slab */}
              <g stroke="#30363d" strokeWidth="0.6" opacity="0.55">
                {WALLS.grid.map((d) => (
                  <path key={d} d={d} fill="none" vectorEffect="non-scaling-stroke" />
                ))}
              </g>
              <g stroke="url(#wall-beam)" strokeWidth="1.4" opacity="0.8">
                {WALLS.beams.map((d) => (
                  <path key={d} d={d} fill="none" vectorEffect="non-scaling-stroke" />
                ))}
              </g>
              {WALLS.corners.map(([cx, cy], i) => (
                <circle
                  // biome-ignore lint/suspicious/noArrayIndexKey: static wall node coordinates
                  key={i}
                  cx={cx}
                  cy={cy}
                  r="0.28"
                  fill="#39d353"
                  opacity="0.75"
                />
              ))}

              {glowAt && (
                <ellipse
                  className="iso-late"
                  cx={glowAt[0]}
                  cy={glowAt[1]}
                  rx="5.4"
                  ry="3.1"
                  fill="url(#hero-glow)"
                />
              )}
              {links.map(({ from, to }) => (
                <g key={`${from.join()}-${to.join()}`}>
                  <path
                    d={linePath(from, to)}
                    fill="none"
                    stroke="#39d353"
                    strokeWidth="2.5"
                    opacity="0.18"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={linePath(from, to)}
                    fill="none"
                    stroke="#39d353"
                    strokeWidth="1.2"
                    strokeDasharray="3 4"
                    opacity="0.75"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
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
            className="iso-late pointer-events-none absolute z-20 w-[15%] -translate-x-1/2 -translate-y-[85%]"
            style={{
              left: `${((iso(busiest)[0] - VX) / VW) * 100}%`,
              top: `${((iso(busiest)[1] - VY) / VH) * 100}%`,
            }}
          >
            <Art id="cutout-cell-cheer" alt="" priority className="h-auto w-full" />
          </div>
        )}

        {/* Three glass callouts anchored around the sample city (no decorative dots, R-13/R-31). */}
        <div
          aria-hidden
          className="iso-late glass-pill pointer-events-none absolute -top-2 left-2 z-20 hidden rounded-xl px-3.5 py-2 text-xs leading-tight sm:block"
        >
          <p className="font-bold text-fg tabular-nums">
            {sampleRecap.contributions.total.toLocaleString("en-US")} contributions
          </p>
          <p className="text-muted">One building per day</p>
        </div>

        {topLang && (
          <div
            aria-hidden
            className="iso-late glass-pill pointer-events-none absolute top-6 right-0 z-20 hidden rounded-xl px-3.5 py-2 text-xs leading-tight md:block"
          >
            <p className="font-bold text-fg tabular-nums">
              {topLang.name} {Math.round(topLang.share * 100)}%
            </p>
            <p className="text-muted">{sampleRecap.languages.distinctCount} languages</p>
          </div>
        )}

        <div
          aria-hidden
          className="iso-late glass-pill pointer-events-none absolute -bottom-2 left-6 z-20 hidden rounded-xl px-3.5 py-2 text-xs leading-tight sm:block"
        >
          <p className="font-bold text-green tabular-nums">
            {sampleRecap.contributions.longestStreak.days}-day longest streak
          </p>
          <p className="text-muted tabular-nums">
            {sampleRecap.contributions.activeDays} active days
          </p>
        </div>
      </div>
    </figure>
  );
}
