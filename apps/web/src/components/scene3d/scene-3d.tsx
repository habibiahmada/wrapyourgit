"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export type ArtId =
  | "hero"
  | "builder"
  | "consistent"
  | "explorer"
  | "collaborator"
  | "night-owl"
  | "open-sourcer"
  | "cell-think"
  | "cell-proud"
  | "cell-sleep";

const SceneCanvas = dynamic(() => import("./canvas"), { ssr: false });

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * A 3D illustration with a baked poster. The PNG (scripts/render-art.ts) paints first, so the
 * page never waits on WebGL (R-40); the live scene loads only when visible and fades in over it.
 * Reduced motion or no WebGL keeps the still image (R-39). Small screens skip post effects.
 */
export function Scene3D({
  art,
  alt,
  className = "",
  priority = false,
}: {
  art: ArtId;
  /** What the picture shows, for screen readers. */
  alt: string;
  className?: string;
  /** Above the fold: load the poster eagerly with high priority (R-40). */
  priority?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const [ready, setReady] = useState(false);
  const [effects, setEffects] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !webglAvailable()) return;
    setEffects(window.innerWidth >= 768);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setLive(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`relative aspect-[4/3] overflow-hidden ${className}`}>
      <Image
        src={`/art/${art}.png`}
        alt={alt}
        width={1200}
        height={900}
        sizes="(min-width: 1024px) 50vw, 100vw"
        preload={priority}
        className={`absolute inset-0 h-full w-full object-cover motion-safe:transition-opacity motion-safe:duration-700 ${ready ? "opacity-0" : "opacity-100"}`}
      />
      {live && (
        <div
          aria-hidden
          className={`absolute inset-0 motion-safe:transition-opacity motion-safe:duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
        >
          <SceneCanvas art={art} effects={effects} onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  );
}
