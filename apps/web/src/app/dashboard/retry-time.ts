/**
 * When the owner can sync again, as text (#195). The server renders the page in UTC and doesn't
 * know the viewer's zone or locale, so until the browser has said (`zone` null) the time is UTC,
 * labelled and in a fixed format: the same on the server and in the first client render, so it
 * hydrates, and never a time in the wrong zone. Then it is the viewer's own time.
 */
export function retryTime(iso: string, zone: string | null): string {
  const at = new Date(iso);
  if (zone === null) {
    const utc = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "UTC",
    }).format(at);
    return `${utc} UTC`;
  }
  return at.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", timeZone: zone });
}
