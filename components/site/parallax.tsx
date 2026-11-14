"use client";
import { useEffect, useRef } from "react";

/**
 * Parallax wrapper: sets CSS variables that the `.px` layers inside use.
 *  --sy  scroll progress of this element (0 at rest, grows while the page scrolls past it)
 *  --mx / --my  pointer position from -1 to 1 (desktop only)
 * Disabled for visitors who prefer reduced motion.
 */
export function Parallax({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const mouse = { x: 0, y: 0 };
    const apply = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const sy = Math.max(-0.4, Math.min(1.2, -r.top / Math.max(r.height, 1)));
      el.style.setProperty("--sy", sy.toFixed(4));
      el.style.setProperty("--mx", mouse.x.toFixed(4));
      el.style.setProperty("--my", mouse.y.toFixed(4));
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(apply); };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
      queue();
    };
    apply();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      window.removeEventListener("pointermove", move);
    };
  }, []);

  return <div ref={ref} className={className}>{children}</div>;
}
