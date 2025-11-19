"use client";

import * as React from "react";
import PropertyCarouselDesktop from "./PropertyCarouselDesktop";
import PropertyCarouselMobile from "./PropertyCarouselMobile";

export default function PropertyCarousel({
  urls,
  onChangeIndex,
}: {
  urls: string[];
  onChangeIndex?: (i: number) => void;
}) {
  // Client-only media detection. Default to desktop until we can detect.
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const m = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(Boolean(m.matches));
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);

  return isMobile ? (
    <PropertyCarouselMobile urls={urls} onChangeIndex={onChangeIndex} />
  ) : (
    <PropertyCarouselDesktop urls={urls} onChangeIndex={onChangeIndex} />
  );
}
