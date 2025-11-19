"use client";

import React, { Suspense } from "react";
import Leaderboard from "@/components/Leaderboard";
import LeaderboardLoadingSkeleton from "@/components/LeaderboardLoadingSkeleton";

export default function LeaderboardsPage() {
  return (
    <Suspense fallback={<LeaderboardLoadingSkeleton />}>
      <Leaderboard />
    </Suspense>
  );
}
