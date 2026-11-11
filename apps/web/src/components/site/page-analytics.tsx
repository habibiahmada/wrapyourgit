"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/**
 * Drops the query string and fragment before a page view leaves the browser, so nothing that
 * travels in a URL's tail (a sign-in error, a settings flag) is stored. The privacy page promises
 * only the page, never its parameters.
 */
export function stripUrl(event: BeforeSendEvent): BeforeSendEvent {
  const url = new URL(event.url);
  url.search = "";
  url.hash = "";
  return { ...event, url: url.toString() };
}

/** Vercel Web Analytics: page views only, no cookies (privacy page, "What we collect"). */
export function PageAnalytics() {
  return <Analytics beforeSend={stripUrl} />;
}
