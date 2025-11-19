"use client";

import React, { useEffect, useRef, useCallback } from "react";
import type { Options as ConfettiOptions } from "canvas-confetti";
import confetti from "canvas-confetti";

type Props = {
  active: boolean;
  duration?: number; // ms
};

// Confetti explosion with a "bang" effect - shoots out and falls down with gravity
export default function Confetti({ active, duration = 3000 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiInstanceRef = useRef<ReturnType<typeof confetti.create> | null>(
    null
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fireConfetti = useCallback(() => {
    if (!confettiInstanceRef.current) return;

    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      colors: ["#FFC857", "#8BD3DD", "#FF9AA2", "#C9B6E1", "#BDECB6"],
    };

    function fire(particleRatio: number, opts: ConfettiOptions) {
      confettiInstanceRef.current?.({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    // Create multiple bursts with wide spread to cover most of the screen
    fire(0.25, {
      spread: 160,
      startVelocity: 65,
    });

    fire(0.2, {
      spread: 180,
      startVelocity: 55,
    });

    fire(0.35, {
      spread: 200,
      decay: 0.91,
      scalar: 0.8,
      startVelocity: 60,
    });

    fire(0.1, {
      spread: 220,
      startVelocity: 45,
      decay: 0.92,
      scalar: 1.2,
    });

    fire(0.1, {
      spread: 240,
      startVelocity: 50,
    });
  }, []);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create confetti instance
    confettiInstanceRef.current = confetti.create(canvas, {
      resize: true,
      useWorker: true,
    });

    // Fire confetti immediately
    fireConfetti();

    // Auto-cleanup after duration
    timeoutRef.current = setTimeout(() => {
      if (confettiInstanceRef.current) {
        confettiInstanceRef.current.reset();
      }
    }, duration);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (confettiInstanceRef.current) {
        confettiInstanceRef.current.reset();
        confettiInstanceRef.current = null;
      }
    };
  }, [active, duration, fireConfetti]);

  // Only render canvas when active to keep DOM small
  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-[9999]"
    />
  );
}
