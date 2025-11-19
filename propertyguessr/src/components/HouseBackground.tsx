"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  svgSrc?: string;
  count?: number;
  minSize?: number;
  maxSize?: number;
  minSpeed?: number;
  maxSpeed?: number;
  baseOpacity?: number;
  zIndex?: number | string;
  tintLight?: string;
  tintDark?: string;
  minViewport?: number;
};

type Sprite = {
  x: number;
  y: number;
  size: number;
  speed: number;
  dir: 1 | -1;
  opacity: number;
};

export default function HouseBackground({
  svgSrc = "/assets/HouseBackground.svg",
  count = 15,
  minSize = 10,
  maxSize = 160,
  minSpeed = 6,
  maxSpeed = 60,
  baseOpacity = 0.08,
  zIndex = 0,
  tintLight = "rgba(0,0,0,0.5)",
  tintDark = "rgba(255,255,255,0.5)",
  minViewport = 768,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(min-width: ${minViewport}px)`);
    const apply = () => setEnabled(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [minViewport]);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const tint = isDark ? tintDark : tintLight;

    let w = 0;
    let h = 0;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const img = new Image();
    img.src = svgSrc;

    let sprites: Sprite[] = [];
    let running = true;
    let last = performance.now();

    const rnd = (a: number, b: number) => Math.random() * (b - a) + a;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawnSprite = (fromEdge?: "left" | "right"): Sprite => {
      const size = rnd(minSize, maxSize);
      const edge = fromEdge ?? (Math.random() < 0.5 ? "left" : "right");
      const dir: 1 | -1 = edge === "left" ? 1 : -1;
      const sizeInfluence = size / maxSize;
      const speed =
        rnd(minSpeed, maxSpeed) * (0.3 + Math.random() + sizeInfluence);
      const y = rnd(0, h);
      const x =
        edge === "left"
          ? -size - rnd(0, w * 0.25)
          : w + size + rnd(0, w * 0.25);
      const opacityJitter = 0.6 + Math.random() * 0.8;
      const sizeFade = Math.max(0.5, 1 - size / (maxSize * 1.2));
      return {
        x,
        y,
        size,
        speed,
        dir,
        opacity: baseOpacity * opacityJitter * sizeFade,
      };
    };

    const seed = () => {
      sprites = Array.from({ length: count }, () =>
        spawnSprite(Math.random() < 0.5 ? "left" : "right")
      );
      if (prefersReduced) sprites.forEach((s) => (s.x = rnd(0, w)));
    };

    const clear = () => {
      ctx.clearRect(0, 0, w, h);
    };

    const drawSprite = (s: Sprite) => {
      if (!img.complete) return;
      ctx.globalAlpha = s.opacity;
      ctx.drawImage(img, s.x, s.y, s.size, s.size);
      ctx.globalAlpha = 1;
    };

    const tintPass = () => {
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    };

    const step = (ts: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;
      clear();
      for (let i = 0; i < sprites.length; i++) {
        const s = sprites[i];
        drawSprite(s);
        if (!prefersReduced) {
          s.x += s.dir * s.speed * dt;
          if (s.dir === 1 && s.x - s.size > w) sprites[i] = spawnSprite("left");
          if (s.dir === -1 && s.x + s.size < 0)
            sprites[i] = spawnSprite("right");
        }
      }
      tintPass();
      rafRef.current = requestAnimationFrame(step);
    };

    const onVisibility = () => {
      if (document.hidden && rafRef.current) {
        running = false;
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      } else if (!document.hidden && !rafRef.current) {
        running = true;
        last = performance.now();
        rafRef.current = requestAnimationFrame(step);
      }
    };

    resize();
    seed();

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    img.decode?.().finally(() => {
      last = performance.now();
      rafRef.current = requestAnimationFrame(step);
    });

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [
    enabled,
    svgSrc,
    count,
    minSize,
    maxSize,
    minSpeed,
    maxSpeed,
    baseOpacity,
    tintLight,
    tintDark,
  ]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex }}
    />
  );
}
