// src/components/Rounds.tsx
"use client";

import React from "react";
import "bootstrap-icons/font/bootstrap-icons.css";

interface RoundsProps {
  round: number;
  handleClick: (round: number) => void;
  disabled?: boolean;
  totalRounds?: number;
  onCurrentClick?: () => void;
}

export default function Rounds({
  round,
  handleClick,
  disabled = false,
  totalRounds = 5,
  onCurrentClick,
}: RoundsProps) {
  const circles = Array.from({ length: totalRounds }, (_, i) => i + 1);

  return (
    <h5 className="flex gap-2 justify-center">
      Round
      {circles.map((circle, index) => {
        if (index < round - 1) {
          // Passed rounds → red "ban" icons
          return (
            <i
              key={index}
              className={`bi bi-ban text-danger ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              onClick={!disabled ? () => handleClick(index + 1) : undefined}
            ></i>
          );
        } else if (index === round - 1) {
          // Current round → green filled circle
          const clickable = !!onCurrentClick && !disabled;
          return (
            <i
              key={index}
              className={`bi bi-${round}-circle text-success ${disabled ? "opacity-50" : ""} ${clickable ? "cursor-pointer" : "cursor-default"}`}
              onClick={clickable ? onCurrentClick : undefined}
              title={clickable ? `Return to round ${round}` : undefined}
            ></i>
          );
        } else {
          // Future rounds → blue outlined circles
          return (
            <i
              key={index}
              className={`bi bi-${index + 1}-circle text-info`}
            ></i>
          );
        }
      })}
    </h5>
  );
}
