// src/components/PriceIndicators.tsx
"use client";

import * as React from "react";

type PriceIndicatorsProps = {
  value: [number, number];
  prettyValue: (v: number) => string;
  chosenColor?: string;
  actualColor?: string;
  top?: number;
};

export default function PriceIndicators({
  value,
  prettyValue,
  top = -20,
}: PriceIndicatorsProps) {
  const toPercent = (v: number) => `${(v / 1000) * 100}%`;

  // Trigger animation when the value changes (i.e., after a guess is made)
  const [animateKey, setAnimateKey] = React.useState(0);

  const guessed = value[0];
  const actual = value[1];

  React.useEffect(() => {
    // bump key to retrigger CSS animation when value changes
    setAnimateKey((k) => k + 1);
  }, [guessed, actual]);

  return (
    <>
      <div
        aria-hidden
        className="price-indicator-container absolute z-10 flex flex-col items-center pointer-events-none -translate-x-1/2"
        key={`guessed-${animateKey}`}
        style={{
          top: top + 60,
          left: toPercent(value[0]),
        }}
      >
        <div className="price-indicator-label price-indicator-animate text-center">
          <div className="font-bold">Your guess</div>
          <div className="mt-1">{prettyValue(value[0])}</div>
        </div>
      </div>

      <div
        aria-hidden
        className="absolute z-10 flex flex-col items-center pointer-events-none -translate-x-1/2"
        style={{
          top: top - 20,
          left: toPercent(value[1]),
        }}
      >
        <div className="price-indicator-label price-indicator-animate actual text-center">
          <div className="font-bold">Actual</div>
          <div className="mt-1">{prettyValue(value[1])}</div>
        </div>
      </div>
    </>
  );
}
