/*
 * Spike (#147). Imported first by the worker: the ride's modules import the font loader, which
 * adds its faces to `document.fonts` at import time. A worker has no document, but it has its own
 * FontFaceSet, which is what its OffscreenCanvas draws text with.
 */
const scope = globalThis as unknown as { document?: unknown; fonts?: unknown };
if (typeof scope.document === "undefined") scope.document = { fonts: scope.fonts };
