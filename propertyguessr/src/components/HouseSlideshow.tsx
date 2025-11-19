"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function HouseSlideshow() {
  const [currentImage, setCurrentImage] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const images = [
    "/assets/HouseHomePage1.png",
    "/assets/HouseHomePage2.png",
    "/assets/HouseHomePage3.png",
    "/assets/HouseHomePage4.png",
    "/assets/HouseHomePage5.png",
    "/assets/HouseHomePage6.png",
    "/assets/HouseHomePage7.png",
    "/assets/HouseHomePage8.png",
    "/assets/HouseHomePage9.png",
    "/assets/HouseHomePage10.png",
    "/assets/HouseHomePage11.png",
    "/assets/HouseHomePage12.png",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 0,
        transform: "translateX(-50%)",
        pointerEvents: "none",
        zIndex: -2,
        opacity: 1,
        width: isMobile ? "220%" : "100%",
      }}
    >
      {images.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt=""
          width={1920}
          height={800}
          priority={index < 2}
          className="house-slideshow-image"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "auto",
            maxHeight: isMobile ? "none" : "800px",
            objectFit: "cover",
            objectPosition: "center center",
            opacity: currentImage === index ? 0.8 : 0,
            transition: "opacity 1s ease-in-out",
            boxShadow:
              "inset 0 60px 80px -20px rgba(0, 0, 0, 0.3), inset 0 -60px 80px -20px rgba(0, 0, 0, 0.3)",
            WebkitMaskImage: isMobile
              ? `radial-gradient(
                  ellipse at center,
                  rgba(0, 0, 0, 1) 0%,
                  rgba(0, 0, 0, 0.9) 20%,
                  rgba(0, 0, 0, 0.6) 40%,
                  rgba(0, 0, 0, 0.3) 60%,
                  rgba(0, 0, 0, 0.1) 80%,
                  rgba(0, 0, 0, 0) 100%
                )`
              : `
              linear-gradient(
                to bottom,
                rgba(0, 0, 0, 1) 0%,
                rgba(0, 0, 0, 1) 60%,
                rgba(0, 0, 0, 0.7) 80%,
                rgba(0, 0, 0, 0) 100%
              ),
              radial-gradient(
                ellipse 50% 100% at center,
                rgba(0, 0, 0, 0.9) 0%,
                rgba(0, 0, 0, 0.7) 30%,
                rgba(0, 0, 0, 0.4) 60%,
                rgba(0, 0, 0, 0.15) 85%,
                rgba(0, 0, 0, 0) 100%
              )
            `,
            WebkitMaskComposite: isMobile ? "source-over" : "source-in",
            maskImage: isMobile
              ? `radial-gradient(
                  ellipse at center,
                  rgba(0, 0, 0, 1) 0%,
                  rgba(0, 0, 0, 0.9) 20%,
                  rgba(0, 0, 0, 0.6) 40%,
                  rgba(0, 0, 0, 0.3) 60%,
                  rgba(0, 0, 0, 0.1) 80%,
                  rgba(0, 0, 0, 0) 100%
                )`
              : `
              linear-gradient(
                to bottom,
                rgba(0, 0, 0, 1) 0%,
                rgba(0, 0, 0, 1) 60%,
                rgba(0, 0, 0, 0.7) 80%,
                rgba(0, 0, 0, 0) 100%
              ),
              radial-gradient(
                ellipse 50% 100% at center,
                rgba(0, 0, 0, 0.9) 0%,
                rgba(0, 0, 0, 0.7) 30%,
                rgba(0, 0, 0, 0.4) 60%,
                rgba(0, 0, 0, 0.15) 85%,
                rgba(0, 0, 0, 0) 100%
              )
            `,
            maskComposite: isMobile ? "source-over" : "intersect",
          }}
        />
      ))}
    </div>
  );
}
