/**
 * The file name a card download should keep: the server's `Content-Disposition` name when it sends
 * one (`/api/card` names the owner's cards), else `fallback`. The preview fetches the card once and
 * saves that same file, so the name has to come from the response rather than the browser.
 */
export function cardFileName(disposition: string | null, fallback: string): string {
  const match = disposition && /filename="?([^";]+)"?/i.exec(disposition);
  const name = match?.[1]?.trim();
  return name && !/[\\/]/.test(name) ? name : fallback;
}
