"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { button } from "@/components/ui";

/** The part of Cloudflare's Turnstile API this page uses. */
interface Turnstile {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      theme: "dark";
      callback(token: string): void;
      "error-callback"(): void;
      "expired-callback"(): void;
    },
  ): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

type State = "checking" | "passed" | "refused" | "unavailable";

const MESSAGE: Record<State, string> = {
  checking:
    "Checking that a person is here. It usually passes on its own; if a box appears, tick it.",
  passed: "Thanks. Reading the year from GitHub now.",
  refused: "That check didn't pass. Try it again.",
  unavailable:
    "The check didn't load. A content blocker or the network may be stopping it; allow challenges.cloudflare.com and try again.",
};

/**
 * Cloudflare Turnstile, then the pass: the widget hands the page a token, the page hands it to
 * /api/verify, and a pass comes back as a cookie. The page then loads again, and this time the
 * server fetches the recap behind the loading screen. Nothing here decides anything: the server
 * checks the token with Cloudflare itself.
 */
export function VerifyGate({ siteKey }: { siteKey: string }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState<State>("checking");

  const redeem = useCallback(async (token: string) => {
    const response = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => null);
    if (response?.ok) {
      setState("passed");
      // A full load, not a refresh: the loading screen shows while the fetch runs.
      window.location.reload();
      return;
    }
    setState("refused");
  }, []);

  useEffect(() => {
    if (!loaded || !box.current || !window.turnstile || widget.current) return;
    const turnstile = window.turnstile;
    const id = turnstile.render(box.current, {
      sitekey: siteKey,
      theme: "dark",
      callback: (token) => void redeem(token),
      "error-callback": () => setState("unavailable"),
      // A token lasts five minutes: a page left open asks for a new one by itself.
      "expired-callback": () => turnstile.reset(id),
    });
    widget.current = id;
    return () => {
      turnstile.remove(id);
      widget.current = null;
    };
  }, [loaded, siteKey, redeem]);

  const again = () => {
    if (!window.turnstile || !widget.current) {
      window.location.reload();
      return;
    }
    setState("checking");
    window.turnstile.reset(widget.current);
  };

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setLoaded(true)}
        onError={() => setState("unavailable")}
      />
      {/* The widget's own height, held from the start so nothing moves when it arrives. */}
      <div ref={box} className="min-h-[65px]" />
      <p role="status" aria-live="polite" className="text-base text-muted">
        {MESSAGE[state]}
      </p>
      {(state === "refused" || state === "unavailable") && (
        <button type="button" onClick={again} className={`${button.primary} self-start`}>
          Try again
        </button>
      )}
      <noscript>
        <p className="font-semibold">This check needs JavaScript, and so does the story.</p>
      </noscript>
    </div>
  );
}
