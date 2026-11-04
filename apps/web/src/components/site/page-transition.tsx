import { type ReactNode, ViewTransition } from "react";

/**
 * Wraps a page's content (never the header, which stays anchored) in React's <ViewTransition>,
 * so every route change animates with the browser's View Transitions API. Links tagged
 * `nav-forward` slide the new page in from the right, `nav-back` from the left; any other
 * navigation crossfades with a small rise. Styles live in globals.css; reduced motion turns
 * them off, and browsers without the API simply swap pages.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-in" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-out" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}

/** Loading fallbacks leave downwards, so the content that replaces them can rise into place. */
export function FallbackTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition exit="slide-down" default="none">
      {children}
    </ViewTransition>
  );
}

/** Content that arrives after a loading fallback rises in. */
export function RevealTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="slide-up" default="none">
      {children}
    </ViewTransition>
  );
}
