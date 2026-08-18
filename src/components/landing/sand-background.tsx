"use client";

import { useEffect, useRef } from "react";

/** Fixed, full-viewport sand-grain texture — the only "background element"
 * in this design; deliberately no gradients or color blobs. On pointer-fine
 * devices, a second grain layer follows the cursor with a soft radial mask
 * so the texture quietly brightens where you're looking — a monochrome
 * spotlight, not a color gradient, so it stays true to the palette. */
export function SandBackground() {
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let frame = 0;
    const onMove = (e: MouseEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        spotlightRef.current?.style.setProperty("--spot-x", `${e.clientX}px`);
        spotlightRef.current?.style.setProperty("--spot-y", `${e.clientY}px`);
        frame = 0;
      });
    };

    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 bg-background">
      <div className="sand-grain absolute inset-0" />
      <div ref={spotlightRef} className="sand-grain-spotlight absolute inset-0 hidden sm:block" />
    </div>
  );
}
