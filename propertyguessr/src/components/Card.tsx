"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children?: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[inherit] w-full border border-[var(--accent)] bg-[var(--leaderboard-bg)]",
        className
      )}
    >
      {children}
    </div>
  );
}
