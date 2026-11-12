import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

// Modules apps/web imports from Server Components. Remotion needs React.createContext, which does
// not exist there, so none of them may reach remotion, @remotion/* or a .tsx file.
// "./world" (world/model.ts) is only used by the client world-player, but is kept Remotion-free too.
// "./export" and "./ride" are client only: the ride's stations name files with Remotion's
// `staticFile`, so they are not on this list.
const ROOT = resolve(import.meta.dir, "..");
const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as {
  exports: Record<string, string>;
};
const WEB_FACING = [
  "./copy",
  "./heat",
  "./world-track",
  "./letter",
  "./languages",
  "./present",
  "./world",
];

// `import type` is erased at build time, so only value imports count.
const IMPORT_RE = /(?:import|export)\s+(?!type\s)(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']/g;

function resolveRelative(from: string, spec: string): string {
  const base = resolve(dirname(from), spec);
  for (const c of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (existsSync(c) && /\.tsx?$/.test(c)) return c;
  }
  throw new Error(`cannot resolve ${spec} from ${from}`);
}

function violations(entry: string): string[] {
  const seen = new Set<string>();
  const bad: string[] = [];
  const walk = (file: string, trail: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    if (file.endsWith(".tsx")) bad.push(`${trail} -> ${file} (.tsx)`);
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(IMPORT_RE)) {
      const spec = m[1] as string;
      if (spec === "remotion" || spec.startsWith("@remotion/") || spec === "react")
        bad.push(`${trail} -> ${spec}`);
      else if (spec.startsWith(".")) walk(resolveRelative(file, spec), `${trail} -> ${file}`);
    }
  };
  walk(entry, "");
  return bad;
}

for (const name of WEB_FACING) {
  test(`${name} stays free of Remotion, React and .tsx`, () => {
    const target = pkg.exports[name];
    expect(target).toBeDefined();
    expect(violations(resolve(ROOT, target as string))).toEqual([]);
  });
}

test("the scan catches theme.ts (sanity)", () => {
  expect(violations(resolve(ROOT, "src/theme.ts")).length).toBeGreaterThan(0);
});
