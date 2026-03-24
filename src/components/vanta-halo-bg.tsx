"use client";

import * as React from "react";

type VantaEffect = {
  destroy: () => void;
};

export function VantaBg({
  className,
}: {
  className?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const vantaRef = React.useRef<VantaEffect | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current || vantaRef.current) return;

      const THREE = await import("three");
      const BIRDS = (await import("vanta/dist/vanta.birds.min")).default as (
        opts: Record<string, unknown>,
      ) => VantaEffect;

      if (cancelled || !containerRef.current) return;

      vantaRef.current = BIRDS({
        el: containerRef.current,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.0,
        minWidth: 200.0,
        scale: 1.0,
        scaleMobile: 1.0,
        color1: 0x100707,
      });
    }

    init();

    return () => {
      cancelled = true;
      if (vantaRef.current) {
        vantaRef.current.destroy();
        vantaRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} className={className} />;
}

export const VantaHaloBg = VantaBg;
