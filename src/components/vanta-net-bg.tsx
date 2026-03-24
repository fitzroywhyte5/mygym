"use client";

import * as React from "react";

type VantaEffect = {
  destroy: () => void;
};

export function VantaNetBg({ className }: { className?: string }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const vantaRef = React.useRef<VantaEffect | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current || vantaRef.current) return;

      const THREE = await import("three");
      const NET = (await import("vanta/dist/vanta.net.min")).default as (
        opts: Record<string, unknown>,
      ) => VantaEffect;

      if (cancelled || !containerRef.current) return;

      vantaRef.current = NET({
        el: containerRef.current,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.0,
        minWidth: 200.0,
        scale: 1.0,
        scaleMobile: 1.0,
        color: 0x1326ca,
        backgroundColor: 0x040413,
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
