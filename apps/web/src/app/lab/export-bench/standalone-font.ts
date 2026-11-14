/*
 * Spike (#147), self-contained build only: the page that hosts it may refuse to fetch the font, so
 * the build passes the font's bytes in and they are added to the worker's FontFaceSet directly.
 */
const scope = globalThis as unknown as {
  __BENCH_FONT?: string;
  fonts?: FontFaceSet;
};
if (scope.__BENCH_FONT && scope.fonts) {
  const bytes = Uint8Array.from(atob(scope.__BENCH_FONT), (c) => c.charCodeAt(0));
  for (const weight of ["400", "700", "800"]) {
    const face = new FontFace("Bricolage Grotesque", bytes.slice().buffer, { weight });
    scope.fonts.add(face);
    void face.load();
  }
}

export {};
