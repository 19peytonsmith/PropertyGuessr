"use client";

import * as React from "react";
import Image from "next/image";
import { PhotoProvider, PhotoView } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";
import { getProxiedImageUrl } from "@/lib/imageProxy";
import { motion } from "framer-motion";

export default function PropertyCarouselMobile({
  urls,
  onChangeIndex,
}: {
  urls: string[];
  onChangeIndex?: (i: number) => void;
}) {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    // reset index when urls change
    setIndex(0);
  }, [urls]);

  React.useEffect(() => {
    onChangeIndex?.(index);
  }, [index, onChangeIndex]);

  // make proxied safe if `urls` is undefined by defaulting to an empty array
  const proxied = React.useMemo(
    () => (urls ?? []).map((u) => getProxiedImageUrl(u)),
    [urls]
  );

  const prev = React.useCallback(() => {
    setIndex((i) => (i - 1 + urls.length) % Math.max(1, urls.length));
  }, [urls.length]);

  const next = React.useCallback(() => {
    setIndex((i) => (i + 1) % Math.max(1, urls.length));
  }, [urls.length]);

  // Touch tracking refs for swipe gestures
  const touchStartX = React.useRef<number | null>(null);
  const touchStartY = React.useRef<number | null>(null);
  const touchMoved = React.useRef(false);
  // ref for thumbnails container so we can scroll the active thumb into view
  const thumbsRef = React.useRef<HTMLDivElement | null>(null);
  // compute translate value so it's relative to the motion div's width.
  // motionDivWidth = count * 100% of parent, so translating by parent widths
  // requires converting index to a percent of the motion div: (index / count)*100%.
  const slideX = React.useMemo(() => {
    const count = proxied.length || 1;
    return `-${(index / count) * 100}%`;
  }, [index, proxied.length]);

  // keep thumbnails scrolled to the active index when index changes
  React.useEffect(() => {
    const container = thumbsRef.current;
    if (!container) return;
    const active = container.querySelector(
      `[data-thumb-index=\"${index}\"]`
    ) as HTMLElement | null;
    if (active) {
      // use smooth scrolling so it follows the main carousel animation
      active.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [index]);

  if (!urls || urls.length === 0) {
    return <div className="w-full h-[300px] bg-[var(--card-bg)] rounded-md" />;
  }

  return (
    <PhotoProvider>
      <div className="relative w-full">
        <div className="relative w-full h-[300px] rounded-md overflow-hidden bg-[#f3f3f3]">
          {/* Current index indicator */}
          <div className="absolute top-2 right-2 z-30">
            <div className="px-2 py-1 rounded-md bg-white/90 text-black text-sm font-medium shadow-sm">
              {`${index + 1}/${urls.length}`}
            </div>
          </div>
          {/* Sliding gallery: place all images in a single flex row and translate
              the row using Framer Motion. This avoids unmount/remount flashes and
              makes transitions smoother when swiping quickly. */}
          <div
            className="w-full h-full overflow-hidden relative"
            onTouchStart={(e) => {
              const t = e.touches[0];
              touchStartX.current = t.clientX;
              touchStartY.current = t.clientY;
              touchMoved.current = false;
            }}
            onTouchMove={(e) => {
              const t = e.touches[0];
              const dx = t.clientX - (touchStartX.current ?? 0);
              const dy = t.clientY - (touchStartY.current ?? 0);
              if (Math.abs(dx) > 10 && Math.abs(dy) < 100) {
                touchMoved.current = true;
              }
            }}
            onTouchEnd={(e) => {
              const lastTouch = e.changedTouches[0];
              const startX = touchStartX.current ?? 0;
              const startY = touchStartY.current ?? 0;
              const dx = lastTouch.clientX - startX;
              const dy = lastTouch.clientY - startY;
              const THRESHOLD = 50; // px
              if (Math.abs(dx) > THRESHOLD && Math.abs(dy) < 120) {
                if (dx > 0) prev();
                else next();
              }
              touchStartX.current = null;
              touchStartY.current = null;
            }}
          >
            <motion.div
              className="h-full flex"
              style={{ width: `${proxied.length * 100}%` }}
              // animate to a translation that's a percent of this element's own width
              // so one index moves exactly one parent-width.
              animate={{ x: slideX }}
              transition={{ duration: 0.28, ease: [0.22, 0.8, 0.2, 1] }}
            >
              {proxied.map((p, i) => (
                <PhotoView key={i} src={urls[i]}>
                  <div
                    className="w-full h-full relative flex-shrink-0"
                    style={{ width: `${100 / Math.max(1, proxied.length)}%` }}
                  >
                    <button
                      aria-label={`Open image ${i + 1}`}
                      className="w-full h-full p-0 m-0 block bg-transparent border-0"
                      onClick={(e) => {
                        if (touchMoved.current) {
                          e.preventDefault();
                          e.stopPropagation();
                          touchMoved.current = false;
                        }
                      }}
                    >
                      <div className="w-full h-full relative">
                        <Image
                          src={p}
                          alt={`Property image ${i + 1}`}
                          fill
                          sizes="(max-width: 768px) 100vw, 800px"
                          priority={i === 0}
                          className="object-cover"
                        />
                      </div>
                    </button>
                  </div>
                </PhotoView>
              ))}
            </motion.div>
          </div>

          {/* Prev / Next buttons */}
          {urls.length > 1 && (
            <>
              <button
                onClick={prev}
                aria-label="Previous"
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 text-white rounded-full w-16 h-16 flex items-center justify-center bg-transparent leading-none"
              >
                <span className="text-5xl block leading-none">‹</span>
              </button>
              <button
                onClick={next}
                aria-label="Next"
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 text-white rounded-full w-16 h-16 flex items-center justify-center bg-transparent leading-none"
              >
                <span className="text-5xl block leading-none">›</span>
              </button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {urls.length > 1 && (
          <div
            ref={thumbsRef}
            className="mt-3 flex items-center gap-2 overflow-x-auto pb-2"
          >
            {proxied.map((p, i) => (
              <button
                key={i}
                data-thumb-index={i}
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === index}
                className={`flex-shrink-0 rounded-md overflow-hidden border-2 ${i === index ? "border-[var(--btn-primary)]" : "border-transparent"} w-[80px] h-[60px]`}
              >
                <Image
                  src={p}
                  alt={`Thumb ${i + 1}`}
                  width={80}
                  height={60}
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </PhotoProvider>
  );
}
