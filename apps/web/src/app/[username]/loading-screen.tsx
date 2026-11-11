import { EDITION_YEAR } from "@wyg/schema";
import { LoadingCell } from "@/components/loading-cell";

/**
 * Streamed at once while the recap is read: the public fetch for a visitor, the auto-sync for the
 * owner. A first read takes a while, so it says what is happening. LoadingCell's cells stay still
 * under reduced motion and the text carries the message. Without a login it is the prerendered
 * shell, shown only until the request's name is read.
 */
export function LoadingScreen({ login }: { login?: string }) {
  const label = login ? `Reading @${login}'s ${EDITION_YEAR} on GitHub…` : "Opening this recap…";
  return (
    <main id="main" className="flex flex-1 flex-col">
      <LoadingCell label={label} />
    </main>
  );
}
