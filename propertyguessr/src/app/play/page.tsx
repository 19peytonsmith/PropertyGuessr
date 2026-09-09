"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Orbitron } from "next/font/google";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import PropertySlider from "@/components/PropertySlider";
import { TextMorph } from "torph/react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { positionAt, priceAt } from "@/lib/price";
import PropertyCarousel from "@/components/PropertyCarousel";
import SubmitButton from "@/components/SubmitButton";
import Rounds from "@/components/Rounds";
import Confetti from "@/components/Confetti";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBed,
  faBathtub,
  faRuler,
  faSpinner,
  faHome,
} from "@fortawesome/free-solid-svg-icons";
import ThemeToggle from "@/components/ThemeToggle";
import "@/styles/app.css";
import "@/styles/bubble-slider.css";
import "@/styles/leaderboard.css";

const ROUNDS = Number(process.env.NEXT_PUBLIC_NUMBER_OF_ROUNDS) || 5;

// The score climbs to its new total rather than cutting to it. The morph rolls
// the digits between each step, so a handful of steps reads as one continuous
// count - where the old tween had to render every number on the way.
const SCORE_ROLL_MS = 900;
const SCORE_STEP_MS = 120;
const SCORE_SPRING = { stiffness: 150, damping: 19, mass: 1.2 };

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// The clock reads out once a second all game, so it gets a shorter roll than
// the score: long enough to see, short enough not to hold the eye.
const TIMER_MORPH_MS = 180;

// The property stats change once a round, on the same card.
const STAT_MORPH_MS = 320;

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

type PropertyInfo = {
  urls: string[];
  value: number;
  beds: number | string;
  baths: number | string;
  square_footage: string;
  address: string;
  city_state_zipcode: string;
  id?: string;
  detailUrl?: string;
};

export default function PlayPage() {
  const router = useRouter();
  // null means "not yet initialized"; afterwards it's string (possibly empty)
  const [listingsParam, setListingsParam] = useState<string | null>(null);
  const isCanada = listingsParam === "canada";

  useEffect(() => {
    // Read `listings` query-param client-side to avoid a prerender / suspense
    // requirement from next/navigation's useSearchParams. We store `null`
    // initially so data-loading can wait until this value is initialized.
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      setListingsParam(sp.get("listings") ?? "");
    } else {
      // On server (unlikely for this client component) keep as empty string
      setListingsParam("");
    }
  }, []);
  const [showMap, setShowMap] = useState<boolean>(false);
  const DEFAULT_MAP_ZOOM = 8;

  const [propertyDataQueue, setPropertyDataQueue] = useState<PropertyInfo[]>(
    []
  );
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [originalIndex, setOriginalIndex] = useState<number>(0);
  const [, setCarouselIndex] = useState<number>(0);

  const [sliderValue, setSliderValue] = useState<number | number[]>(350);
  const [sliderValues, setSliderValues] = useState<Array<number | undefined>>(
    []
  );
  const [sliderResults, setSliderResults] = useState<
    Array<number[] | undefined>
  >([]);

  const [, setScores] = useState<number[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [displayTotal, setDisplayTotal] = useState<number>(0);
  const [showDelta, setShowDelta] = useState<boolean>(false);
  const [lastDelta, setLastDelta] = useState<number>(0);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [animatingScore, setAnimatingScore] = useState<boolean>(false);
  const rollRef = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [holdDisplayUntilAnimation, setHoldDisplayUntilAnimation] =
    useState<boolean>(false);

  // Stepped eight or so times across the climb rather than every frame: the
  // morph carries the digits from one step to the next, so the count reads as
  // continuous at a fraction of the work.
  const revealTotal = (from: number, to: number) => {
    if (rollRef.current) window.clearInterval(rollRef.current);
    setAnimatingScore(true);

    // The hold is what keeps the effect below from syncing the readout to the
    // new total, so it stays on until the climb has arrived there itself.
    const arrive = () => {
      setDisplayTotal(to);
      setAnimatingScore(false);
      setHoldDisplayUntilAnimation(false);
    };

    if (reducedMotion) {
      arrive();
      return;
    }

    const started = performance.now();
    rollRef.current = window.setInterval(() => {
      const t = Math.min(1, (performance.now() - started) / SCORE_ROLL_MS);
      if (t < 1) {
        setDisplayTotal(Math.round(from + (to - from) * easeOutCubic(t)));
        return;
      }
      if (rollRef.current) window.clearInterval(rollRef.current);
      rollRef.current = null;
      arrive();
    }, SCORE_STEP_MS);
  };

  useEffect(() => {
    if (!holdDisplayUntilAnimation) {
      setDisplayTotal(total);
    }
  }, [total, holdDisplayUntilAnimation]);

  useEffect(() => {
    return () => {
      if (rollRef.current) window.clearInterval(rollRef.current);
    };
  }, []);

  useEffect(() => {
    if (lastDelta >= 950) {
      setShowConfetti(true);
      const id = window.setTimeout(() => setShowConfetti(false), 3000);
      return () => window.clearTimeout(id);
    }
    return;
  }, [lastDelta]);
  const [roundLocked, setRoundLocked] = useState<boolean>(false);
  const [pendingNextRound, setPendingNextRound] = useState<boolean>(false);
  const [color, setColor] = useState<string>("primary");
  const [getResults, setGetResults] = useState<boolean>(false);
  const [isLoadingResults, setIsLoadingResults] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);
  // Timer state (tracks elapsed time from start of play until results)
  const startTimeRef = useRef<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const timerRef = useRef<number | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);

  const currentData = useMemo(
    () => propertyDataQueue[currentIndex],
    [propertyDataQueue, currentIndex]
  );

  useEffect(() => {
    // initialize client id (4-digit) persisted per browser/device
    try {
      const key = "property_clientId";
      let id = null;
      if (typeof window !== "undefined") id = localStorage.getItem(key);
      if (!id) {
        const rand = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
        id = String(rand);
        try {
          localStorage.setItem(key, id);
        } catch {
          // ignore
        }
      }
      setClientId(id);
    } catch {
      // ignore storage errors
    }

    setShowMap(false);
  }, [currentIndex]);

  // Start the timer on page load (mount) and stop when results are ready
  // NOTE: run once on mount so the timer continues across rounds
  useEffect(() => {
    // start immediately on mount
    startTimeRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      if (startTimeRef.current) setElapsedMs(Date.now() - startTimeRef.current);
    }, 250) as unknown as number;

    return () => {
      // cleanup on unmount
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Stop/finalize the timer when we hit the results state
  useEffect(() => {
    if (getResults && startTimeRef.current != null) {
      const final = startTimeRef.current
        ? Date.now() - startTimeRef.current
        : elapsedMs;
      setElapsedMs(final);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      startTimeRef.current = null;
    }
  }, [getResults, elapsedMs]);

  // Orbitron font is imported via next/font/google (see top of file)

  const handlePropertySliderOnChange: React.ComponentProps<
    typeof PropertySlider
  >["onChange"] = (_e, newVal) => {
    if (!roundLocked) {
      setSliderValue(newVal as number | number[]);
    }
  };

  // Load property data once listingsParam has been initialized. This ensures
  // that when the client requests `listings=canada` we don't start fetching
  // from the default collection before reading the query param.
  useEffect(() => {
    if (listingsParam === null) return; // not initialized yet

    let isMounted = true;

    const fetchPropertyInfo = async (
      index: number,
      maxAttempts = 20,
      delayMs = 300,
      excludes: string[] = []
    ): Promise<PropertyInfo | null> => {
      const isValid = (data: unknown): data is PropertyInfo => {
        const d = data as Partial<PropertyInfo> | null | undefined;
        return (
          !!d &&
          typeof d.value === "number" &&
          Array.isArray(d.urls) &&
          d.urls.length > 2 &&
          typeof d.address === "string"
        );
      };

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const params = new URLSearchParams();
          params.set("page", String(index));
          params.set("attempt", String(attempt));
          if (listingsParam) params.set("listings", listingsParam);
          if (excludes.length > 0) {
            // send as comma-separated string; backend expects `toExclude` for resampling
            params.set("toExclude", excludes.join(","));
          }

          const res = await fetch(`/api/property_info?${params.toString()}`, {
            cache: "no-store",
          });

          if (!res.ok) {
            console.warn(
              `property_info fetch not ok (status=${res.status}), attempt=${attempt}`
            );
          } else {
            const body = await res.json();
            if (isValid(body)) {
              return body;
            }
            console.warn("property_info returned invalid data, retrying", body);
          }
        } catch (err) {
          console.warn("Error fetching property_info, retrying", err);
        }

        await new Promise((r) => setTimeout(r, delayMs));
      }

      console.error(
        `Failed to fetch a valid property after ${maxAttempts} attempts (seed=${index}).`
      );
      return null;
    };

    (async () => {
      const localUsedIds: string[] = [];
      for (let i = 0; i < ROUNDS; i++) {
        const data = await fetchPropertyInfo(i, 20, 300, localUsedIds);
        if (data && isMounted) {
          setPropertyDataQueue((prev) => [...prev, data]);
          if (data.id) localUsedIds.push(data.id);
        } else {
          console.error(`Could not load property for round ${i}`);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [listingsParam]);

  const calculateScore = (guessMoney: number, valueOfHome: number) => {
    const percentageError = (guessMoney - valueOfHome) / valueOfHome;
    return Math.round(1000 * Math.E ** -Math.abs(percentageError));
  };

  function formatDuration(ms: number | null | undefined) {
    if (ms == null || isNaN(ms)) return "0:00";
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  const handleSubmit = (valueOfHome: number) => {
    const numericSlider = Array.isArray(sliderValue)
      ? sliderValue[0]
      : sliderValue;
    const scoreForRound = calculateScore(
      priceAt(numericSlider),
      valueOfHome
    );

    setSliderValues((prev) => {
      const updated = [...prev];
      updated[currentIndex] = numericSlider;
      return updated;
    });

    setSliderResults((prev) => {
      const updated = [...prev];
      updated[currentIndex] = [
        numericSlider,
        positionAt(valueOfHome),
      ];
      return updated;
    });

    setScores((prev) => [...prev, scoreForRound]);

    const prevTotal = total;
    const newTotal = prevTotal + scoreForRound;

    setHoldDisplayUntilAnimation(true);
    setTotal(newTotal);

    setLastDelta(scoreForRound);
    setShowDelta(true);

    window.setTimeout(() => {
      setShowDelta(false);
      revealTotal(prevTotal, newTotal);
    }, 600);

    setSliderValue([numericSlider, positionAt(valueOfHome)]);

    setRoundLocked(true);
    if (currentIndex < ROUNDS - 1) {
      setPendingNextRound(true);
    } else {
      setGetResults(true);
    }
    setColor("warning");
  };

  const handleNextRoundClick = () => {
    setRoundLocked(false);
    setPendingNextRound(false);
    setColor("primary");
    setSliderValue(350);
    setCurrentIndex((i) => i + 1);
    setOriginalIndex(currentIndex + 1);
    setCarouselIndex(0);
  };

  const handleRoundClick = (round: number) => {
    setColor("secondary");
    if (!roundLocked) {
      setOriginalIndex(currentIndex);
      setRoundLocked(true);
    }
    setCurrentIndex(round - 1);
    const result = sliderResults[round - 1];
    if (result) {
      setSliderValue(result);
    } else {
      const sv = sliderValues[round - 1];
      setSliderValue(typeof sv === "number" ? sv : 350);
    }
  };

  const handleBackToOriginalRound = () => {
    setCurrentIndex(originalIndex);
    setRoundLocked(false);
    setSliderValue(350);
  };

  const handleGetResults = () => {
    setIsLoadingResults(true);
    // Use localStorage rather than cookies to avoid per-cookie size limits
    let existingRaw: unknown = [];
    if (typeof window !== "undefined") {
      try {
        const raw =
          localStorage.getItem("leaderboardScores") ||
          Cookies.get("leaderboardScores");
        existingRaw = raw ? JSON.parse(raw) : [];
      } catch (err) {
        console.warn(
          "Failed to parse stored leaderboard data, starting fresh",
          err
        );
        existingRaw = [];
      }
    }

    const existing = Array.isArray(existingRaw)
      ? (existingRaw
          .map((it: unknown) => {
            if (typeof it === "number")
              return { score: it, ts: null, durationMs: null };
            if (it && typeof it === "object" && "score" in it) {
              const o = it as {
                score?: unknown;
                ts?: unknown;
                durationMs?: unknown;
              };
              const scoreVal = typeof o.score === "number" ? o.score : 0;
              const tsVal = typeof o.ts === "number" ? o.ts : null;
              const durVal =
                typeof o.durationMs === "number" ? o.durationMs : null;
              return { score: scoreVal, ts: tsVal, durationMs: durVal };
            }
            return null;
          })
          .filter(Boolean) as {
          score: number;
          ts: number | null;
          durationMs: number | null;
        }[])
      : [];

    const finalDuration = startTimeRef.current
      ? Date.now() - startTimeRef.current
      : elapsedMs;
    const updated = [
      ...existing,
      {
        score: total,
        ts: Date.now(),
        durationMs: finalDuration,
        clientId,
        isCanada,
      },
    ];

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("leaderboardScores", JSON.stringify(updated));
      } catch (err) {
        // localStorage can throw in some privacy modes; fall back to cookies
        console.warn("localStorage unavailable, falling back to cookies", err);
        Cookies.set("leaderboardScores", JSON.stringify(updated), {
          expires: 7,
        });
      }
    }

    // Also attempt to persist the score to global storage (MongoDB) via API.
    (async () => {
      try {
        await fetch("/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score: total,
            ts: Date.now(),
            durationMs: finalDuration,
            clientId,
            isCanada,
          }),
        });
      } catch (err) {
        // don't block navigation; log to console for diagnostics
        console.warn("Failed to persist global score", err);
      }
    })();

    // preserve listings context so Leaderboard's "Try Again" can return to the
    // same listing pool (e.g. Canada)
    const lbUrl = isCanada
      ? "/leaderboards?fromPlay=true&listings=canada"
      : "/leaderboards?fromPlay=true";
    router.push(lbUrl);
  };

  const buttonState = () => {
    if (getResults) {
      return (
        <button
          className="btn btn-success px-5 py-2"
          onClick={handleGetResults}
          disabled={isLoadingResults}
        >
          <b>Get Results</b>
          {isLoadingResults && (
            <FontAwesomeIcon icon={faSpinner} spin className="ms-2" />
          )}
        </button>
      );
    } else if (pendingNextRound) {
      return (
        <button
          className="btn btn-primary px-5 py-2"
          onClick={handleNextRoundClick}
        >
          <b>Next Round</b>
        </button>
      );
    } else if (roundLocked) {
      return (
        <button
          className="btn btn-secondary px-5 py-2"
          onClick={handleBackToOriginalRound}
        >
          <b>Go back to Round {originalIndex + 1}</b>
        </button>
      );
    } else {
      return (
        <SubmitButton
          onClick={() => currentData && handleSubmit(currentData.value)}
        >
          <b>Go!</b>
        </SubmitButton>
      );
    }
  };

  return (
    <div className="mx-auto my-auto flex">
      <Confetti active={showConfetti} />
      {currentData ? (
        <div className="main-content p-4 mx-auto relative bg-[var(--card-bg)]">
          <div className="play-page-header flex justify-between items-center mb-1">
            <h1 className="my-0">{currentData.address}</h1>
            <div className="flex items-center gap-2">
              <button
                className="play-home-btn"
                onClick={() => setShowExitConfirm(true)}
                title="Go Home"
              >
                <span className="play-home-icon" aria-hidden>
                  <FontAwesomeIcon icon={faHome} />
                </span>
                <span className="hidden md:inline">Home</span>
              </button>
              <div className="flex items-center gap-2">
                <div
                  className={`play-home-btn ${orbitron.className} orbitron timer-display`}
                  role="status"
                  aria-label={`Time elapsed: ${formatDuration(elapsedMs)}`}
                  title={`Time elapsed: ${formatDuration(elapsedMs)}`}
                >
                  <TextMorph duration={TIMER_MORPH_MS}>
                    {formatDuration(elapsedMs)}
                  </TextMorph>
                </div>
                <ThemeToggle />
              </div>
            </div>
          </div>
          <div className="property-info-row flex justify-between">
            <h4>{currentData.city_state_zipcode}</h4>
            <div className="property-data flex gap-2">
              <h5 className="text-end">
                <FontAwesomeIcon icon={faBed} />{" "}
                <TextMorph duration={STAT_MORPH_MS}>
                  {String(currentData.beds)}
                </TextMorph>
                <span className="small-text">bd</span>
              </h5>
              <h5 className="text-end">
                <FontAwesomeIcon icon={faBathtub} />{" "}
                <TextMorph duration={STAT_MORPH_MS}>
                  {String(currentData.baths)}
                </TextMorph>
                <span className="small-text">ba</span>
              </h5>
              <h5 className="text-end">
                <FontAwesomeIcon icon={faRuler} />{" "}
                <TextMorph duration={STAT_MORPH_MS}>
                  {String(currentData.square_footage)}
                </TextMorph>
                <span className="small-text">
                  ft<sup>2</sup>
                </span>
              </h5>
            </div>
          </div>

          <hr className="my-1 my-md-3" />
          <div className="flex items-center justify-between">
            <h5 className="m-0">
              Score{" "}
              <span className="inline-flex items-center relative d-block d-sm-inline">
                <TextMorph
                  className={`score-number ${animatingScore ? "anim" : ""}`}
                  ease={SCORE_SPRING}
                >
                  {String(displayTotal)}
                </TextMorph>
                {showDelta ? (
                  <span className={`score-delta show`}>+{lastDelta}</span>
                ) : null}
                <span className="score-max">/{ROUNDS * 1000}</span>
              </span>
            </h5>

            <div className="flex items-center gap-2 flex-col sm:flex-row">
              {currentData.address ? (
                <button
                  className="btn btn-outline-primary icon-link"
                  onClick={() => setShowMap((s) => !s)}
                  aria-expanded={showMap}
                  aria-controls="property-map-embed"
                >
                  {showMap ? "Hide Map" : "Show on Map"}
                  <svg
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    className="bi"
                    fill="currentColor"
                  >
                    <path d="M11 16C11 16.5523 11.4477 17 12 17C12.5523 17 13 16.5523 13 16H11ZM8.21567 14.3922C8.75496 14.2731 9.09558 13.7394 8.97647 13.2001C8.85735 12.6608 8.32362 12.3202 7.78433 12.4393L8.21567 14.3922ZM16.2157 12.4393C15.6764 12.3202 15.1426 12.6608 15.0235 13.2001C14.9044 13.7394 15.245 14.2731 15.7843 14.3922L16.2157 12.4393ZM15 7C15 8.65685 13.6569 10 12 10V12C14.7614 12 17 9.76142 17 7H15ZM12 10C10.3431 10 9 8.65685 9 7H7C7 9.76142 9.23858 12 12 12V10ZM9 7C9 5.34315 10.3431 4 12 4V2C9.23858 2 7 4.23858 7 7H9ZM12 4C13.6569 4 15 5.34315 15 7H17C17 4.23858 14.7614 2 12 2V4ZM11 11V16H13V11H11ZM20 17C20 17.2269 19.9007 17.5183 19.5683 17.8676C19.2311 18.222 18.6958 18.5866 17.9578 18.9146C16.4844 19.5694 14.3789 20 12 20V22C14.5917 22 16.9861 21.5351 18.7701 20.7422C19.6608 20.3463 20.4435 19.8491 21.0171 19.2463C21.5956 18.6385 22 17.8777 22 17H20ZM12 20C9.62114 20 7.51558 19.5694 6.04218 18.9146C5.30422 18.5866 4.76892 18.222 4.43166 17.8676C4.0993 17.5183 4 17.2269 4 17H2C2 17.8777 2.40438 18.6385 2.98287 19.2463C3.55645 19.8491 4.33918 20.3463 5.2299 20.7422C7.01386 21.5351 9.40829 22 12 22V20ZM4 17C4 16.6824 4.20805 16.2134 4.96356 15.6826C5.70129 15.1644 6.81544 14.7015 8.21567 14.3922L7.78433 12.4393C6.22113 12.7846 4.83528 13.3285 3.81386 14.0461C2.81023 14.7512 2 15.747 2 17H4ZM15.7843 14.3922C17.1846 14.7015 18.2987 15.1644 19.0364 15.6826C19.792 16.2134 20 16.6824 20 17H22C22 15.747 21.1898 14.7512 20.1861 14.0461C19.1647 13.3285 17.7789 12.7846 16.2157 12.4393L15.7843 14.3922Z"></path>
                  </svg>
                </button>
              ) : null}
              {roundLocked && currentData.detailUrl ? (
                <a
                  className="btn btn-outline-success icon-link icon-link-hover"
                  href={currentData.detailUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  View on Zillow
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="bi"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                    fill="currentColor"
                  >
                    <path d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z" />
                  </svg>
                </a>
              ) : null}
            </div>
          </div>

          {currentData.address ? (
            <div
              className={`map-embed-container mt-0 mt-md-3 ${showMap ? "map-visible" : ""}`}
              id="property-map-embed"
            >
              <iframe
                title={`Map for ${currentData.address}`}
                src={`https://www.google.com/maps?q=${encodeURIComponent(
                  `${currentData.address}, ${currentData.city_state_zipcode}`
                )}&z=${DEFAULT_MAP_ZOOM}&output=embed`}
                className="map-embed border-0"
                allowFullScreen
                loading="lazy"
              />
            </div>
          ) : null}
          <hr className="my-1 mb-md-3 mt-md-0" />

          <PropertyCarousel
            key={`round-${currentIndex}`}
            urls={currentData.urls}
            onChangeIndex={setCarouselIndex}
          />

          <PropertySlider
            value={sliderValue}
            onChange={handlePropertySliderOnChange}
            disabled={roundLocked}
            color={color}
            onSubmit={() => currentData && handleSubmit(currentData.value)}
            isCanada={isCanada}
          />

          <div className="round-div">
            <Rounds
              round={originalIndex + 1}
              handleClick={handleRoundClick}
              disabled={pendingNextRound || getResults}
              totalRounds={ROUNDS}
              onCurrentClick={
                currentIndex !== originalIndex
                  ? handleBackToOriginalRound
                  : undefined
              }
            />
          </div>

          <div className="submit-btn text-center my-3">{buttonState()}</div>
        </div>
      ) : (
        <LoadingSkeleton />
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div
          className="exit-modal-backdrop"
          onClick={() => setShowExitConfirm(false)}
        >
          <div className="exit-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Are you sure?</h3>
            <p>All progress will be lost if you leave this page.</p>
            <div className="exit-modal-actions">
              <button
                className="exit-modal-btn exit-cancel"
                onClick={() => setShowExitConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="exit-modal-btn exit-confirm"
                onClick={() => {
                  setIsExiting(true);
                  router.push("/");
                }}
                disabled={isExiting}
              >
                Leave
                {isExiting && (
                  <FontAwesomeIcon icon={faSpinner} spin className="ms-2" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
