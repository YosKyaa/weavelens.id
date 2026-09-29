"use client";

import { useEffect, useRef } from "react";

/**
 * Sorot cahaya hangat yang mengikuti kursor (desktop saja).
 * Mati di perangkat sentuh dan saat pengguna memilih "kurangi gerakan".
 */
export function CursorLight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const light = ref.current;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!light || !finePointer || reduced) return;

    let frame = 0;
    let x = 0;
    let y = 0;

    function handleMove(event: PointerEvent) {
      x = event.clientX;
      y = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!light) return;
        light.style.opacity = "1";
        light.style.transform = `translate3d(${x - 300}px, ${y - 300}px, 0)`;
      });
    }

    function handleLeave() {
      if (light) light.style.opacity = "0";
    }

    window.addEventListener("pointermove", handleMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", handleLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handleMove);
      document.documentElement.removeEventListener("pointerleave", handleLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-30 size-[600px] rounded-full opacity-0 mix-blend-soft-light transition-opacity duration-500"
      style={{
        background: "radial-gradient(circle, rgb(255 190 130 / 0.55), transparent 65%)",
      }}
    />
  );
}
