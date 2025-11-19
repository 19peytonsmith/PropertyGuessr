"use client";

import * as React from "react";
import Image from "next/image";
import { Carousel, Status } from "react-responsive-3d-carousel";
import "react-responsive-3d-carousel/dist/styles.css";
import { PhotoProvider, PhotoView } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";
import { BlurFade } from "@/components/BlurFade";
import { getProxiedImageUrl } from "@/lib/imageProxy";

export default function PropertyCarouselDesktop({
  urls,
  onChangeIndex,
}: {
  urls: string[];
  onChangeIndex?: (i: number) => void;
}) {
  const [curIndex, setCurIndex] = React.useState(0);
  const [visibleImagesLoaded, setVisibleImagesLoaded] = React.useState<
    Set<string>
  >(new Set());
  const [allImagesLoaded, setAllImagesLoaded] = React.useState(false);

  // Convert all URLs to use proxy
  const proxiedUrls = React.useMemo(
    () => urls.map((url) => getProxiedImageUrl(url)),
    [urls]
  );

  // Get the initially visible URLs (first 3 and last 2)
  // We do this because the carousel shows 5 images at a time
  // and we want to prioritize loading the initial ones first
  const visibleUrls = React.useMemo(() => {
    if (proxiedUrls.length <= 5) return proxiedUrls;
    return [
      ...proxiedUrls.slice(0, 3), // First 3
      ...proxiedUrls.slice(proxiedUrls.length - 2), // Last 2
    ];
  }, [proxiedUrls]);

  // Reset when URLs change
  React.useEffect(() => {
    setVisibleImagesLoaded(new Set());
    setAllImagesLoaded(false);
  }, [proxiedUrls]);

  const handleVisibleImageLoad = React.useCallback((url: string) => {
    setVisibleImagesLoaded((prev) => {
      const newSet = new Set(prev);
      newSet.add(url);
      return newSet;
    });
  }, []);

  // Check if visible images are loaded
  React.useEffect(() => {
    if (
      visibleImagesLoaded.size === visibleUrls.length &&
      visibleUrls.length > 0
    ) {
      const allLoaded = visibleUrls.every((url) =>
        visibleImagesLoaded.has(url)
      );
      if (allLoaded) {
        setTimeout(() => setAllImagesLoaded(true), 100);
      }
    }
  }, [visibleImagesLoaded, visibleUrls]);

  const items = React.useMemo(
    () =>
      proxiedUrls.map((url, idx) => {
        const isVisible = idx < 3 || idx >= proxiedUrls.length - 2;
        const originalUrl = urls[idx]; // Use original URL for PhotoView

        return (
          <PhotoView key={idx} src={originalUrl}>
            <div className="relative w-full h-[300px]">
              <Image
                src={url}
                alt={`Property image ${idx + 1}`}
                fill
                sizes="800px"
                priority={isVisible}
                loading={isVisible ? "eager" : "lazy"}
                className="object-cover cursor-pointer"
              />
            </div>
          </PhotoView>
        );
      }),
    [proxiedUrls, urls]
  );

  const handleChange = React.useCallback(
    (index: number) => {
      setCurIndex(index);
      onChangeIndex?.(index);
    },
    [onChangeIndex]
  );

  return (
    <PhotoProvider>
      {/* Preload only the 5 visible images (first 3 and last 2) */}
      <div className="absolute left-[-9999px] top-[-9999px]">
        {visibleUrls.map((url, idx) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`preload-${idx}`}
            src={url}
            alt=""
            onLoad={() => handleVisibleImageLoad(url)}
            onError={() => handleVisibleImageLoad(url)}
          />
        ))}
      </div>

      {/* Loading skeleton - shown while visible images are loading */}
      {!allImagesLoaded && (
        <div className="carousel-stack">
          <div className="skeleton carousel-left-left" />
          <div className="skeleton carousel-left" />
          <div className="skeleton carousel-center" />
          <div className="skeleton carousel-right" />
          <div className="skeleton carousel-right-right" />
        </div>
      )}

      {/* Show carousel once visible images are loaded */}
      {allImagesLoaded && (
        <BlurFade
          delay={0}
          inView={false}
          duration={1}
          blur="8px"
          direction="up"
          offset={12}
        >
          <Carousel
            items={items}
            startIndex={0}
            height="auto"
            containerHeight="300px"
            autoPlay={false}
            showIndicators={false}
            showStatus={false}
            showArrows
            transformDuration={1000}
            onChange={handleChange}
          >
            <div className="absolute top-0 right-0 z-10">
              <Status
                color="var(--status)"
                length={items.length}
                curIndex={curIndex}
              />
            </div>
          </Carousel>
        </BlurFade>
      )}
    </PhotoProvider>
  );
}
