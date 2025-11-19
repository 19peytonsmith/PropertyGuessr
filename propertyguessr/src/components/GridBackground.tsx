"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

type Props = {
  gridSize?: number;
  lineWidth?: number;
  skewY?: number;
  zIndex?: number | string;
  colorLight?: string;
  colorDark?: string;
  minViewport?: number;
};

export default function GridBackground({
  gridSize = 60,
  lineWidth = 1,
  skewY = 15,
  zIndex = -1,
  colorLight = "rgba(0,0,0,0.08)",
  colorDark = "rgba(255,255,255,0.08)",
  minViewport = 0,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(min-width: ${minViewport}px)`);
    const apply = () => setEnabled(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [minViewport]);

  useEffect(() => {
    if (!enabled || !mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isDark = resolvedTheme === "dark";
    const color = isDark ? colorDark : colorLight;

    let w = 0;
    let h = 0;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Apply skewY transformation
      ctx.save();
      ctx.transform(1, Math.tan((skewY * Math.PI) / 180), 0, 1, 0, 0);

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;

      // Draw vertical lines
      const numVerticalLines = Math.ceil(w / gridSize) + 5;
      for (let i = 0; i <= numVerticalLines; i++) {
        const x = i * gridSize - gridSize * 2;
        ctx.beginPath();
        ctx.moveTo(x, -h * 2);
        ctx.lineTo(x, h * 3);
        ctx.stroke();
      }

      // Draw horizontal lines - extend further to cover skewed areas
      const numHorizontalLines = Math.ceil(h / gridSize) + 15;
      for (let i = -5; i <= numHorizontalLines; i++) {
        const y = i * gridSize - gridSize * 5;
        ctx.beginPath();
        ctx.moveTo(-w * 2, y);
        ctx.lineTo(w * 3, y);
        ctx.stroke();
      }

      ctx.restore();

      // Apply radial gradient mask on top
      ctx.globalCompositeOperation = "destination-in";

      const centerX = w / 2;
      const centerY = h / 2;
      const maxRadius = Math.sqrt(w * w + h * h) / 2;

      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        maxRadius
      );

      gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(0.4, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(0.7, "rgba(255, 255, 255, 0.3)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // Reset composite operation
      ctx.globalCompositeOperation = "source-over";
    };

    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [
    enabled,
    mounted,
    gridSize,
    lineWidth,
    skewY,
    colorLight,
    colorDark,
    resolvedTheme,
  ]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex }}
    />
  );
}
