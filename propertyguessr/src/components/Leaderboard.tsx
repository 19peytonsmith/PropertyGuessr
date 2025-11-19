// src/components/Leaderboard.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Cookies from "js-cookie";
import "../styles/leaderboard.css";
import ThemeToggle from "./ThemeToggle";
import LeaderboardLoadingSkeleton from "./LeaderboardLoadingSkeleton";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRotateRight,
  faHome,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import Confetti from "./Confetti";
import { Card } from "./Card";
import { motion } from "framer-motion";

export default function Leaderboard() {
  type Entry = {
    score: number;
    playNumber: number;
    ts?: number | null;
    durationMs?: number | null;
    clientId?: string | null;
    isCanada?: boolean;
  };
  const [localClientId, setLocalClientId] = useState<string | null>(null);
  const [leaderboardScores, setLeaderboardScores] = useState<Entry[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPlay = searchParams.get("fromPlay") === "true";
  // displayedScores maps playNumber -> currently-displayed numeric score (for animation)
  const [displayedScores, setDisplayedScores] = useState<
    Record<number, number>
  >({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [renderOrder, setRenderOrder] = useState<number[]>([]);
  const [highlightedPlayNumber, setHighlightedPlayNumber] = useState<
    number | null
  >(null);
  const [mostRecentPlayNumber, setMostRecentPlayNumber] = useState<
    number | null
  >(null);
  const [activeTab, setActiveTab] = useState<"local" | "global">("local");
  const [globalScores, setGlobalScores] = useState<Entry[] | null>(null);
  const [globalLoading, setGlobalLoading] = useState<boolean>(false);
  const [animationDuration, setAnimationDuration] = useState<number>(2);
  const animationDelayRef = useRef<number | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const loadStartRef = useRef<number | null>(null);
  const minLoadingRef = useRef<number | null>(null);

  // Touch / tooltip handling: on touch devices we prefer click-to-toggle tooltips
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);
  const [openTooltipPlay, setOpenTooltipPlay] = useState<number | null>(null);
  useEffect(() => {
    if (activeTab !== "global") return;
    let isMounted = true;
    setGlobalLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/scores");
        if (!res.ok) throw new Error("failed to fetch global scores");
        const data = await res.json();
        if (!isMounted) return;
        // data is array of { score, ts, durationMs, clientId }
        const entries: Entry[] = Array.isArray(data)
          ? data.map((it: unknown) => {
              const obj = it as Record<string, unknown>;
              return {
                score:
                  typeof obj.score === "number" ? (obj.score as number) : 0,
                playNumber: 0, // will set after sorting
                ts: typeof obj.ts === "number" ? (obj.ts as number) : null,
                durationMs:
                  typeof obj.durationMs === "number"
                    ? (obj.durationMs as number)
                    : null,
                clientId:
                  typeof obj.clientId === "string"
                    ? (obj.clientId as string)
                    : null,
                // include isCanada flag returned by the API so the UI can show the maple leaf
                isCanada: !!obj.isCanada,
              };
            })
          : [];

        // sort by score desc, tiebreaker = shortest duration
        const compareEntriesForRank = (a: Entry, b: Entry) => {
          if (b.score !== a.score) return b.score - a.score;
          const aDur =
            typeof a.durationMs === "number"
              ? a.durationMs
              : Number.POSITIVE_INFINITY;
          const bDur =
            typeof b.durationMs === "number"
              ? b.durationMs
              : Number.POSITIVE_INFINITY;
          return aDur - bDur;
        };

        const sorted = entries.slice().sort(compareEntriesForRank);
        // assign playNumber as rank for display
        const withRank = sorted.map((e, i) => ({ ...e, playNumber: i + 1 }));
        if (!isMounted) return;
        setGlobalScores(withRank);
      } catch (err) {
        console.error("Failed to load global scores", err);
      } finally {
        if (isMounted) setGlobalLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  // load the local client id to mark "(You)" in global list
  useEffect(() => {
    try {
      const id = localStorage.getItem("property_clientId");
      setLocalClientId(id);
    } catch {
      setLocalClientId(null);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(touch);
  }, []);

  // close the open tooltip if the user clicks/taps outside of the timestamp icon
  useEffect(() => {
    if (openTooltipPlay == null) return;
    const onDocClick = (e: MouseEvent) => {
      const el = document.querySelector(
        `[data-tooltip-pn="${openTooltipPlay}"]`
      ) as HTMLElement | null;
      if (!el) {
        setOpenTooltipPlay(null);
        return;
      }
      if (!el.contains(e.target as Node)) {
        setOpenTooltipPlay(null);
      }
    };
    document.addEventListener("click", onDocClick, true);
    return () => document.removeEventListener("click", onDocClick, true);
  }, [openTooltipPlay]);

  useEffect(() => {
    // make parsing async so we can show a skeleton while cookie reads/parsing are "pending"
    setLoading(true);
    loadStartRef.current = Date.now();
    const t = window.setTimeout(() => {
      // Prefer localStorage (much larger), fall back to cookie for compatibility
      let raw: string | undefined | null = null;
      try {
        raw = localStorage.getItem("leaderboardScores");
      } catch {
        // localStorage may be unavailable in some privacy modes; fall back to cookie
        raw = Cookies.get("leaderboardScores");
      }

      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          // parsed may be an array of numbers (legacy) or array of objects { score, ts }
          // We assume it's chronological (oldest first). Map to Entry array preserving playNumber.
          const entries: Entry[] = Array.isArray(parsed)
            ? parsed.map((item: unknown, i: number) => {
                if (typeof item === "number") {
                  return {
                    score: item,
                    playNumber: i + 1,
                    ts: null,
                    durationMs: null,
                    isCanada: false,
                  };
                }
                if (item && typeof item === "object" && "score" in item) {
                  const it = item as {
                    score?: unknown;
                    ts?: unknown;
                    durationMs?: unknown;
                    isCanada?: unknown;
                  };
                  const scoreVal = typeof it.score === "number" ? it.score : 0;
                  const tsVal = typeof it.ts === "number" ? it.ts : null;
                  const durVal =
                    typeof it.durationMs === "number" ? it.durationMs : null;
                  const isCanadaVal =
                    typeof it.isCanada === "boolean" ? it.isCanada : false;
                  return {
                    score: scoreVal,
                    playNumber: i + 1,
                    ts: tsVal,
                    durationMs: durVal,
                    isCanada: isCanadaVal,
                  };
                }
                return {
                  score: 0,
                  playNumber: i + 1,
                  ts: null,
                  durationMs: null,
                  isCanada: false,
                };
              })
            : [];
          setLeaderboardScores(entries);
          // initialize displayed scores immediately to the actual values
          const initial: Record<number, number> = {};
          entries.forEach((e) => (initial[e.playNumber] = e.score));
          setDisplayedScores(initial);
          // initial render order: sort descending by score, tiebreaker = shortest duration
          const compareEntriesForRank = (a: Entry, b: Entry) => {
            if (b.score !== a.score) return b.score - a.score;
            const aDur =
              typeof a.durationMs === "number"
                ? a.durationMs
                : Number.POSITIVE_INFINITY;
            const bDur =
              typeof b.durationMs === "number"
                ? b.durationMs
                : Number.POSITIVE_INFINITY;
            return aDur - bDur; // smaller duration ranks higher
          };

          setRenderOrder(
            entries
              .slice()
              .sort(compareEntriesForRank)
              .map((e) => e.playNumber)
          );
        } catch (error) {
          console.error("Failed to parse leaderboard scores:", error);
        }
      }

      // enforce a minimum visible skeleton time (300ms)
      const elapsed = loadStartRef.current
        ? Date.now() - loadStartRef.current
        : 0;
      const minMs = 300;
      const remaining = Math.max(0, minMs - elapsed);
      if (remaining > 0) {
        minLoadingRef.current = window.setTimeout(() => {
          setLoading(false);
          minLoadingRef.current = null;
        }, remaining);
      } else {
        setLoading(false);
      }
    }, 40);

    return () => {
      window.clearTimeout(t);
      if (minLoadingRef.current) {
        window.clearTimeout(minLoadingRef.current);
        minLoadingRef.current = null;
      }
    };
  }, []);

  // When leaderboardScores change, determine if we should animate the last entry
  useEffect(() => {
    if (!leaderboardScores || leaderboardScores.length === 0) return;
    const last = leaderboardScores[leaderboardScores.length - 1];
    // Consider it "just played" if timestamp is very recent (30s)
    const recentWindow = 30 * 1000;
    if (last && last.ts && Date.now() - last.ts < recentWindow) {
      // Calculate final position based on score (with duration tiebreaker)
      const compareEntriesForRank = (a: Entry, b: Entry) => {
        if (b.score !== a.score) return b.score - a.score;
        const aDur =
          typeof a.durationMs === "number"
            ? a.durationMs
            : Number.POSITIVE_INFINITY;
        const bDur =
          typeof b.durationMs === "number"
            ? b.durationMs
            : Number.POSITIVE_INFINITY;
        return aDur - bDur;
      };

      const sorted = leaderboardScores.slice().sort(compareEntriesForRank);
      const targetIndex = sorted.findIndex(
        (e) => e.playNumber === last.playNumber
      );

      // Calculate dynamic duration based on distance
      // Min 0.5s for nearby positions, max 3s for far positions
      const totalItems = leaderboardScores.length;
      const distanceFromBottom = totalItems - 1 - targetIndex;
      const normalizedDistance =
        distanceFromBottom / Math.max(totalItems - 1, 1);
      const calculatedDuration = 0.5 + normalizedDistance * 1.5; // 0.5s to 2s range
      setAnimationDuration(calculatedDuration);

      // Move newly-played entry to the bottom of the render order and hold there for 1s
      setRenderOrder((prev) => {
        const copy = prev.filter((p) => p !== last.playNumber);
        copy.push(last.playNumber);
        return copy;
      });
      // highlight the new row immediately (blue tint) during hold and movement
      setHighlightedPlayNumber(last.playNumber);

      // hold at bottom for 1s before animating to final position
      if (animationDelayRef.current)
        window.clearTimeout(animationDelayRef.current);
      animationDelayRef.current = window.setTimeout(() => {
        // Move to final position
        setRenderOrder((prev) => {
          const copy = prev.filter((p) => p !== last.playNumber);
          copy.splice(targetIndex, 0, last.playNumber);
          return copy;
        });

        // Mark as landed after animation completes
        setTimeout(() => {
          if (targetIndex === 0) {
            setShowConfetti(true);
          }
          setLandedPlayNumber(last.playNumber);
          setHighlightedPlayNumber(null);

          if (landingTimeoutRef.current)
            window.clearTimeout(landingTimeoutRef.current);
          landingTimeoutRef.current = window.setTimeout(() => {
            setLandedPlayNumber(null);
            // Add the persistent pulsing glow after landed animation completes
            setMostRecentPlayNumber(last.playNumber);
            landingTimeoutRef.current = null;
          }, 900);
        }, calculatedDuration * 1000); // Use dynamic duration

        animationDelayRef.current = null;
      }, 1000); // 1000ms hold at bottom
    }
  }, [leaderboardScores]);

  // Scroll to bottom when a new highlighted item is set, then scroll to center when it moves
  useEffect(() => {
    if (!highlightedPlayNumber) return;

    // Wait for list ref to be ready
    const waitForList = () => {
      if (!listRef.current) {
        setTimeout(waitForList, 50);
        return;
      }

      const list = listRef.current;

      // Wait for DOM to fully render the new item
      const tryScroll = (attempts = 0) => {
        if (attempts > 10) return;

        const item = list.querySelector(
          `[data-play-number="${highlightedPlayNumber}"]`
        );
        if (item) {
          // Instantly scroll to bottom
          const targetScroll = list.scrollHeight - list.clientHeight;
          list.scrollTop = targetScroll;
        } else {
          setTimeout(() => tryScroll(attempts + 1), 100);
        }
      };

      tryScroll();
    };

    waitForList();
  }, [highlightedPlayNumber]);

  // When renderOrder changes (item moves to final position), track and center it during animation
  useEffect(() => {
    if (!highlightedPlayNumber || !listRef.current) return;

    const list = listRef.current;
    const item = list.querySelector(
      `[data-play-number="${highlightedPlayNumber}"]`
    ) as HTMLElement;

    if (!item) return;

    // Calculate if item is at bottom (initial position)
    const isAtBottom =
      renderOrder[renderOrder.length - 1] === highlightedPlayNumber;
    if (isAtBottom) return; // Don't scroll yet, wait for it to move

    // Item has moved to final position, track it during the animation
    const delayBeforeTracking = 500; // Wait 0.5s before starting to center
    const startTime = Date.now();
    let rafId: number;

    const trackElement = () => {
      const elapsed = Date.now() - startTime;

      // Don't start tracking until after the delay
      if (elapsed < delayBeforeTracking) {
        rafId = requestAnimationFrame(trackElement);
        return;
      }

      const progress = Math.min(elapsed / (animationDuration * 1000), 1);

      const listRect = list.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      const itemTop = itemRect.top - listRect.top + list.scrollTop;
      const itemHeight = itemRect.height;
      const listHeight = list.clientHeight;

      // Calculate center position
      const targetScroll = itemTop - listHeight / 2 + itemHeight / 2;
      const currentScroll = list.scrollTop;
      const distance = targetScroll - currentScroll;

      // Smoothly interpolate to keep item centered
      list.scrollTop = currentScroll + distance * 0.2;

      // Continue tracking during animation
      if (progress < 1) {
        rafId = requestAnimationFrame(trackElement);
      } else {
        // Final snap to perfect center
        list.scrollTop = targetScroll;
      }
    };

    // Start tracking with a small delay
    setTimeout(() => {
      rafId = requestAnimationFrame(trackElement);
    }, 50);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [highlightedPlayNumber, renderOrder, animationDuration]);

  // Refs for animation
  const listRef = useRef<HTMLUListElement | null>(null);
  const landingTimeoutRef = useRef<number | null>(null);
  const [landedPlayNumber, setLandedPlayNumber] = useState<number | null>(null);

  // cleanup pending animation delay on unmount
  useEffect(() => {
    return () => {
      if (animationDelayRef.current) {
        window.clearTimeout(animationDelayRef.current);
        animationDelayRef.current = null;
      }
      setHighlightedPlayNumber(null);
      if (landingTimeoutRef.current) {
        window.clearTimeout(landingTimeoutRef.current);
        landingTimeoutRef.current = null;
      }
      setLandedPlayNumber(null);
    };
  }, []);

  function formatAchieved(ts: number | null | undefined) {
    if (!ts) return "";
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - d.getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;

    const ordinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    // If within a reasonable recent window (7 days) show relative time
    if (diff < minute) return `Achieved just now`;
    if (diff < hour) {
      const mins = Math.round(diff / minute);
      return `Achieved ${mins} ${mins === 1 ? "minute" : "minutes"} ago`;
    }
    if (diff < day) {
      const hrs = Math.round(diff / hour);
      return `Achieved ${hrs} ${hrs === 1 ? "hour" : "hours"} ago`;
    }
    if (diff < week) {
      const days = Math.round(diff / day);
      return `Achieved ${days} ${days === 1 ? "day" : "days"} ago`;
    }

    // Otherwise show full date (no time)
    const month = d.toLocaleString(undefined, { month: "long" });
    const dayNum = d.getDate();
    const year = d.getFullYear();
    return `Achieved on ${month} ${ordinal(dayNum)}, ${year}`;
  }

  function formatDuration(ms: number | null | undefined) {
    if (ms == null || isNaN(ms)) return "";
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  // Prepare rendered items based on renderOrder to keep reordering controlled
  const renderedItems = renderOrder.map((pn, idx) => {
    const entry = leaderboardScores.find((e) => e.playNumber === pn)!;
    return (
      <motion.li
        layout
        initial={false}
        transition={{
          layout: {
            type: "tween",
            duration: animationDuration,
            ease: [0.45, 0, 0.15, 1], // Stronger ease in, smooth ease out
          },
        }}
        onClick={(e: React.MouseEvent) => {
          // On touch devices, allow tapping the whole row to toggle the "Achieved on" tooltip.
          if (!isTouchDevice) return;
          if (!entry.ts) return;
          e.stopPropagation();
          setOpenTooltipPlay((prev) =>
            prev === entry.playNumber ? null : entry.playNumber
          );
        }}
        data-play-number={entry.playNumber}
        className={`leaderboard-item rank-${idx + 1} ${
          highlightedPlayNumber === entry.playNumber ? "animating" : ""
        } ${landedPlayNumber === entry.playNumber ? "landed" : ""} ${
          mostRecentPlayNumber === entry.playNumber ? "most-recent" : ""
        }`}
        key={entry.playNumber}
      >
        <span className="score-label">
          {entry.isCanada ? (
            <Image
              src="/assets/maple-leaf.svg"
              alt="Canadian score"
              className="me-1 maple-leaf-icon"
              aria-hidden
              width={14}
              height={14}
            />
          ) : null}
          <span className="label-text">
            Game <span className="play-number">#</span>
            {entry.playNumber}
          </span>
          {entry.ts ? (
            <Tooltip
              title={formatAchieved(entry.ts)}
              arrow
              disableHoverListener={isTouchDevice}
              disableFocusListener={isTouchDevice}
              // disable MUI's built-in touch handling on touch devices because
              // we implement click-to-toggle behavior instead
              disableTouchListener={isTouchDevice}
              open={
                isTouchDevice ? openTooltipPlay === entry.playNumber : undefined
              }
              onClose={() => isTouchDevice && setOpenTooltipPlay(null)}
            >
              <span
                className="timestamp-icon"
                aria-label={formatAchieved(entry.ts)}
                data-tooltip-pn={entry.playNumber}
                onPointerUp={(e: React.PointerEvent<HTMLSpanElement>) => {
                  // prefer pointer-up for touch compatibility; ignore non-touch pointer types
                  // but still allow toggling when our touch-detection heuristic matches
                  // (covers some hybrid devices)
                  const pType = e.pointerType;
                  if (!isTouchDevice && pType && pType !== "touch") return;
                  e.stopPropagation();
                  setOpenTooltipPlay((prev) =>
                    prev === entry.playNumber ? null : entry.playNumber
                  );
                }}
                onKeyDown={(e) => {
                  if (!isTouchDevice) return;
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setOpenTooltipPlay((prev) =>
                      prev === entry.playNumber ? null : entry.playNumber
                    );
                  }
                  if (e.key === "Escape") setOpenTooltipPlay(null);
                }}
                role={isTouchDevice ? "button" : undefined}
                tabIndex={isTouchDevice ? 0 : -1}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="9"></circle>
                  <path d="M12 7v5l3 2"></path>
                </svg>
              </span>
            </Tooltip>
          ) : null}
        </span>
        <span className="score-value">
          {displayedScores[entry.playNumber] ?? entry.score}
          {entry.durationMs ? (
            <span className="time-value">
              {" "}
              — {formatDuration(entry.durationMs)}
            </span>
          ) : null}
        </span>
      </motion.li>
    );
  });

  return (
    <div className="leaderboard-container">
      {showConfetti ? <Confetti active={showConfetti} /> : null}
      {/* header moved inside the card */}
      {loading ? (
        <LeaderboardLoadingSkeleton />
      ) : (
        <>
          <Card className="rounded-xl">
            <div className="leaderboard-card">
              {/* Heading moved inside the card */}
              <div className="card-top-row">
                <h1 className="card-title">Leaderboard</h1>
              </div>

              <hr className="leaderboard-divider" />

              <div className="tabs-row">
                <div className="leaderboard-tabs flex gap-2 mb-2">
                  <button
                    className={`tab-btn ${activeTab === "local" ? "active" : ""}`}
                    onClick={() => setActiveTab("local")}
                    aria-pressed={activeTab === "local"}
                  >
                    Local
                  </button>
                  <button
                    className={`tab-btn ${activeTab === "global" ? "active" : ""}`}
                    onClick={() => setActiveTab("global")}
                    aria-pressed={activeTab === "global"}
                  >
                    Global
                  </button>
                </div>
                <div className="tabs-right">
                  <ThemeToggle />
                </div>
              </div>

              <div className="leaderboard-list-wrapper">
                {activeTab === "local" ? (
                  <ul ref={listRef} className="leaderboard-list">
                    {renderedItems}
                  </ul>
                ) : globalLoading ? (
                  <LeaderboardLoadingSkeleton compact />
                ) : globalScores && globalScores.length > 0 ? (
                  <ul className="leaderboard-list">
                    {globalScores.map((entry, idx) => {
                      const isYou =
                        localClientId && entry.clientId === localClientId;
                      const displayClient = entry.clientId ?? "----";
                      return (
                        <li
                          key={`global-${displayClient}-${idx}`}
                          className={`leaderboard-item rank-${idx + 1}`}
                        >
                          <span className="score-label">
                            {isYou ? (
                              <Tooltip title="You" arrow>
                                <span
                                  className="you-indicator"
                                  aria-label="You"
                                >
                                  <FontAwesomeIcon
                                    icon={faUser}
                                    className="you-icon"
                                  />
                                </span>
                              </Tooltip>
                            ) : null}
                            <span className="global-username flex items-center">
                              {/* If this score is Canadian, show the maple leaf SVG */}
                              {entry.isCanada ? (
                                <Image
                                  src="/assets/maple-leaf.svg"
                                  alt="Canadian score"
                                  className="me-1 maple-leaf-icon"
                                  aria-hidden
                                  width={14}
                                  height={14}
                                />
                              ) : null}
                              <span className="label-text">
                                User <span className="play-number">#</span>
                                {displayClient}
                              </span>
                            </span>
                            {entry.ts ? (
                              <Tooltip
                                title={formatAchieved(entry.ts)}
                                arrow
                                disableHoverListener={isTouchDevice}
                                disableFocusListener={isTouchDevice}
                                disableTouchListener={isTouchDevice}
                                open={
                                  isTouchDevice
                                    ? openTooltipPlay === entry.playNumber
                                    : undefined
                                }
                                onClose={() =>
                                  isTouchDevice && setOpenTooltipPlay(null)
                                }
                              >
                                <span
                                  className="timestamp-icon"
                                  aria-hidden
                                  data-tooltip-pn={entry.playNumber}
                                  onPointerUp={(
                                    e: React.PointerEvent<HTMLSpanElement>
                                  ) => {
                                    if (!isTouchDevice) return;
                                    const pType = e.pointerType;
                                    if (pType && pType !== "touch") return;
                                    e.stopPropagation();
                                    setOpenTooltipPlay((prev) =>
                                      prev === entry.playNumber
                                        ? null
                                        : entry.playNumber
                                    );
                                  }}
                                >
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden
                                  >
                                    <circle cx="12" cy="12" r="9"></circle>
                                    <path d="M12 7v5l3 2"></path>
                                  </svg>
                                </span>
                              </Tooltip>
                            ) : null}
                          </span>
                          <span className="score-value">
                            {entry.score}
                            {entry.durationMs ? (
                              <span className="time-value">
                                {" "}
                                — {formatDuration(entry.durationMs)}
                              </span>
                            ) : null}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="text-center">
                    <p>No global scores yet, better be the first!</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <div className="leaderboard-actions" aria-hidden={false}>
            <button
              className="leaderboard-home"
              onClick={() => router.push("/")}
              title="Home"
            >
              <span className="home-icon" aria-hidden>
                <FontAwesomeIcon icon={faHome} />
              </span>
              Home
            </button>
            {fromPlay && (
              <button
                className="leaderboard-tryagain"
                onClick={() => {
                  const listingsParam = searchParams.get("listings");
                  const target = listingsParam
                    ? `/play?listings=${encodeURIComponent(listingsParam)}`
                    : "/play";
                  router.push(target);
                }}
                title="Try Again"
              >
                Try Again
                <span className="retry-icon" aria-hidden>
                  <FontAwesomeIcon icon={faRotateRight} />
                </span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
