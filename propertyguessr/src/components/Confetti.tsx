"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Options as ConfettiOptions } from "canvas-confetti";
import confetti from "canvas-confetti";

type Props = {
  active: boolean;
};

const PARTICLE_COUNT = 200;

// A particle dies when its tick count reaches `ticks`, and canvas-confetti fades
// it out linearly over that life. Give every particle far more ticks than it
// needs to reach the bottom, so it drops off the page at near-full opacity
// instead of thinning out and vanishing in mid-air.
const SHARED: ConfettiOptions = {
  origin: { y: 0.7 },
  colors: ["#FFC857", "#8BD3DD", "#FF9AA2", "#C9B6E1", "#BDECB6"],
  gravity: 1.8,
  ticks: 900,
};

// Multiple bursts with wide spread to cover most of the screen
const BURSTS: Array<{ ratio: number; opts: ConfettiOptions }> = [
  { ratio: 0.25, opts: { spread: 160, startVelocity: 65 } },
  { ratio: 0.2, opts: { spread: 180, startVelocity: 55 } },
  {
    ratio: 0.35,
    opts: { spread: 200, startVelocity: 60, decay: 0.91, scalar: 0.8 },
  },
  {
    ratio: 0.1,
    opts: { spread: 220, startVelocity: 45, decay: 0.92, scalar: 1.2 },
  },
  { ratio: 0.1, opts: { spread: 240, startVelocity: 50 } },
];

// Confetti explosion with a "bang" effect - shoots out and falls off the page
export default function Confetti({ active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const instanceRef = useRef<ReturnType<typeof confetti.create> | null>(null);
  const inFlightRef = useRef(0);
  const firedRef = useRef(false);
  const [visible, setVisible] = useState(false);

  // A rising edge on `active` shows the canvas. Nothing hides it but the
  // particles themselves finishing their fall, so the burst is never cut short.
  useEffect(() => {
    if (active) setVisible(true);
  }, [active]);

  useEffect(() => {
    if (!visible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const instance = confetti.create(canvas, { resize: true, useWorker: true });
    instanceRef.current = instance;

    return () => {
      instanceRef.current = null;
      inFlightRef.current = 0;
      instance.reset();
    };
  }, [visible]);

  // One burst per rising edge of `active`. `active` going false only re-arms
  // the trigger - it never cuts a burst short.
  useEffect(() => {
    if (!active) {
      firedRef.current = false;
      return;
    }

    const instance = instanceRef.current;
    if (!instance || firedRef.current) return;

    firedRef.current = true;
    inFlightRef.current += 1;

    Promise.all(
      BURSTS.map(({ ratio, opts }) =>
        instance({
          ...SHARED,
          ...opts,
          particleCount: Math.floor(PARTICLE_COUNT * ratio),
        }),
      ),
    ).then(() => {
      inFlightRef.current -= 1;
      // Every particle has expired well below the fold - safe to unmount, so
      // long as this instance is still the live one.
      if (inFlightRef.current === 0 && instanceRef.current === instance) {
        setVisible(false);
      }
    });
  }, [active, visible]);

  // Only render canvas when active to keep DOM small
  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-[9999]"
    />
  );
}
