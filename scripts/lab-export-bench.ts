/*
 * Spike (#147, never merged): builds the export bench as one self-contained HTML file, for hosts
 * where the Next route is not deployed (Vercel builds production only, ADR-0018). The worker's
 * source, the font and the logos are inlined, since such a page may fetch nothing.
 *
 *   bun scripts/lab-export-bench.ts <out.html>
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const lab = join(root, "apps/web/src/app/lab/export-bench");
const out = process.argv[2];
if (!out) throw new Error("Usage: bun scripts/lab-export-bench.ts <out.html>");

const FONT_URL =
  "https://fonts.gstatic.com/s/bricolagegrotesque/v9/3y9H6as8bTXq_nANBjzKo3IeZx8z6up5BeSl5jBNz_19PpbpMXuECpwUxJBOm_OJWiawA1Xp.woff2";

async function bundle(entry: string): Promise<string> {
  const result = await Bun.build({
    entrypoints: [join(lab, entry)],
    target: "browser",
    format: "iife",
    minify: true,
    define: { "process.env.NODE_ENV": '"production"' },
  });
  if (!result.success || !result.outputs[0]) {
    throw new Error(result.logs.map(String).join("\n"));
  }
  return result.outputs[0].text();
}

// A path tsc does not follow: the kit pulls in the video package, which this package does not type.
const kitPath = join(root, "packages/video/src/world/ride/bench-kit.ts");
const samplePath = join(root, "packages/video/src/fixtures/sample-recap.ts");
const kit = (await import(kitPath)) as { rideLogos: (data: unknown) => string[] };
const { sampleRecap } = (await import(samplePath)) as { sampleRecap: unknown };

const logos: Record<string, string> = {};
for (const href of kit.rideLogos(sampleRecap)) {
  const file = join(root, "packages/video/public", decodeURIComponent(href.replace(/^\//, "")));
  let text = await readFile(file, "utf8");
  const tag = text.match(/<svg[^>]*>/)?.[0] ?? "";
  if (!/\swidth=/.test(tag)) text = text.replace("<svg", '<svg width="256" height="256"');
  logos[href] = `data:image/svg+xml;base64,${Buffer.from(text).toString("base64")}`;
}

const font = Buffer.from(await (await fetch(FONT_URL)).arrayBuffer()).toString("base64");
const worker = await bundle("standalone.worker.ts");
const page = await bundle("standalone-entry.ts");
const html = (await readFile(join(lab, "standalone.html"), "utf8"))
  .replace(
    "/*BENCH*/",
    () => `window.__BENCH=${JSON.stringify({ worker, font, logos }).replace(/<\//g, "<\\/")};`,
  )
  .replace("/*PAGE*/", () => page.replace(/<\/script/gi, "<\\/script"));
await writeFile(out, html);
console.log(`${out}: ${(html.length / 1e6).toFixed(2)} MB, ${Object.keys(logos).length} logos`);
