"use client";

import React from "react";

export default function LoadingSkeleton() {
  return (
    <div className="main-content p-4 mx-auto bg-[var(--card-bg)]">
      {/* Header section */}
      {/* Mobile: action buttons full-width above the address, spaced between */}
      <div className="md:hidden mb-1">
        <div className="flex w-full items-center justify-between mb-2">
          <div className="skeleton w-9 h-9 rounded-md" aria-hidden />
          <div className="skeleton w-[90px] h-8 rounded-lg" aria-hidden />
          <div className="skeleton w-9 h-9 rounded-full" aria-hidden />
        </div>
        <div>
          <div className="skeleton skeleton-title" />
        </div>
      </div>

      {/* Desktop: address on left, action buttons on the right (same row) */}
      <div className="hidden md:flex md:items-center md:justify-between mb-1">
        <div className="skeleton skeleton-title" />
        <div className="flex items-center gap-2">
          <div className="skeleton w-24 h-9 rounded-md" aria-hidden />
          <div className="skeleton w-[90px] h-8 rounded-lg" aria-hidden />
          <div className="skeleton w-9 h-9 rounded-full" aria-hidden />
        </div>
      </div>

      {/* Property info row */}
      <div className="property-info-row flex justify-between">
        <div className="skeleton skeleton-subtitle" />
        <div className="property-data flex gap-2 my-2">
          <div className="skeleton skeleton-chip" />
          <div className="skeleton skeleton-chip" />
          <div className="skeleton skeleton-chip" />
        </div>
      </div>

      <hr className="my-1 my-md-3" />
      <div className="flex justify-between items-center">
        <div className="skeleton skeleton-score" />
        <div className="skeleton skeleton-show-map" />
      </div>

      <hr className="my-1 my-md-3" />

      <div className="carousel-stack">
        <div className="skeleton carousel-left-left" />
        <div className="skeleton carousel-left" />
        <div className="skeleton carousel-center" />
        <div className="skeleton carousel-right" />
        <div className="skeleton carousel-right-right" />
      </div>

      {/* Mobile thumbnail skeletons (visible on small screens) */}
      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-2 md:hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="skeleton flex-shrink-0 w-20 h-14 rounded-md"
          />
        ))}
      </div>

      <div className="mt-3">
        <div className="skeleton skeleton-slider" />
        <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:justify-end">
          <div className="skeleton w-2.5 h-4 rounded-sm hidden sm:block" />
          <div className="skeleton w-full sm:w-[120px] h-8 rounded-md" />
        </div>
      </div>

      <div className="round-div mt-3 flex justify-center">
        <div className="skeleton skeleton-rounds" />
      </div>

      <div className="submit-btn text-center my-3">
        <div className="skeleton skeleton-button mx-auto" />
      </div>
    </div>
  );
}
