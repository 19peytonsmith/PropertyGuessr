"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import imageLoader from "@/lib/imageLoader";
import ThemeToggle from "@/components/ThemeToggle";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faQuestion,
  faEnvelope,
  faBolt,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import HouseSlideshow from "@/components/HouseSlideshow";

export default function SplashPage() {
  const playText = "Play".split("");
  const [showWhat, setShowWhat] = useState(false);
  const [isLoadingPlay, setIsLoadingPlay] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowWhat(false);
    };

    if (showWhat) {
      document.addEventListener("keydown", onKey);
      // prevent background scroll and add dimming class
      document.body.classList.add("modal-open");
      // focus the close button for accessibility
      setTimeout(() => closeBtnRef.current?.focus(), 0);
    } else {
      document.body.classList.remove("modal-open");
    }

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("modal-open");
    };
  }, [showWhat]);

  return (
    <div className="splash-wrap overflow-hidden">
      <div className="main-content splash-hero p-5 mx-auto relative text-center">
        <HouseSlideshow />

        <div className="flex justify-between items-center gap-2 relative z-10">
          <div className="header-left flex items-center">
            <button
              type="button"
              className="what-btn backdrop-blur-xs"
              aria-haspopup="dialog"
              aria-expanded={showWhat}
              aria-controls="what-modal"
              onClick={() => setShowWhat(true)}
              title="What is this?"
            >
              <FontAwesomeIcon icon={faQuestion} />
            </button>
          </div>

          <div className="header-right flex items-center gap-2">
            <div className="backdrop-blur-xs">
              <ThemeToggle />
            </div>
            <Link
              href="/contact-me"
              className="btn btn-outline-secondary backdrop-blur-xs"
              aria-label="Contact me"
            >
              <FontAwesomeIcon icon={faEnvelope} />
              <span className="ms-2">Contact Me</span>
            </Link>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="splash-title">PropertyGuessr</h1>
        </div>

        <p className="splash-lead relative z-10 bg-black/25 text-white rounded-lg px-4 py-3 max-w-3xl mx-auto">
          PropertyGuessr is a GeoGuessr-inspired game where you&apos;re shown 5
          random homes — complete with photos and details — and your challenge
          is simple: guess the price!
        </p>

        <div className="splash-cta relative z-10">
          <Link
            href="/play"
            className={`play-btn backdrop-blur-xs ${isLoadingPlay ? "loading" : ""}`}
            aria-label="Play PropertyGuessr"
            onClick={() => setIsLoadingPlay(true)}
          >
            <span className="play-text">
              {playText.map((ch, idx) => (
                <span
                  key={idx}
                  className="play-letter"
                  style={{
                    animationDelay: isLoadingPlay
                      ? `${idx * 150}ms`
                      : `${idx * 60}ms`,
                  }}
                >
                  {ch}
                </span>
              ))}
            </span>
          </Link>

          <div className="flex items-center justify-center gap-2">
            <Link
              href="/play?listings=canada"
              className="backdrop-blur-xs play-btn-canada"
              aria-label="Play Canada Edition"
              title="Play Canada Edition"
            >
              <Image
                loader={imageLoader}
                unoptimized
                src="/assets/maple-leaf.svg"
                alt="Maple leaf"
                className="me-2 maple-leaf-icon"
                aria-hidden
                width={18}
                height={18}
              />
              {/* Split the label into spans so we can animate each letter */}
              <span className="canada-text" aria-hidden>
                {"Play Canada".split("").map((ch, i) => {
                  // mark spaces so they don't animate but preserve spacing
                  if (ch === " ")
                    return (
                      <span key={i} className="canada-letter space">
                        {ch}
                      </span>
                    );
                  return (() => {
                    const letterStyle = {
                      ["--i"]: i,
                    } as unknown as React.CSSProperties;
                    return (
                      <span
                        key={i}
                        className={`canada-letter`}
                        style={letterStyle}
                        data-index={i}
                      >
                        {ch}
                      </span>
                    );
                  })();
                })}
              </span>
            </Link>

            <Link
              href="/leaderboards"
              className="backdrop-blur-xs btn btn-lg btn-outline-secondary ghost-btn-accessible"
            >
              Leaderboards
            </Link>
          </div>
        </div>

        <hr className="relative z-10" />

        <div className="meta-row relative z-10">
          <div className="byline" aria-label="Author">
            By Peyton Smith
          </div>
          <div className="links flex gap-2 items-center">
            <a
              className="icon-link theme-like backdrop-blur-xs"
              href="https://github.com/19peytonsmith/PropertyGuessr"
              target="_blank"
              rel="noreferrer noopener"
              aria-label="GitHub repository link"
            >
              <FontAwesomeIcon icon={faGithub} />
              <span className="visually-hidden">GitHub</span>
            </a>

            <a
              className="energy-btn backdrop-blur-xs"
              href="https://ko-fi.com/19peytonsmith"
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Buy me an Energy Drink (tips)"
              title="Buy me an Energy Drink"
            >
              <FontAwesomeIcon icon={faBolt} />
              <span className="ms-2 buy-energy-text">
                Buy me an Energy Drink
              </span>
            </a>
          </div>
        </div>

        {showWhat &&
          createPortal(
            <div
              className="splash-modal-backdrop"
              role="presentation"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowWhat(false);
              }}
            >
              <div
                id="what-modal"
                className="splash-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="what-modal-title"
              >
                <div className="flex justify-between items-center gap-3">
                  <h2 id="what-modal-title">What is this?</h2>
                  <div>
                    <button
                      ref={closeBtnRef}
                      className="btn btn-outline-secondary modal-close backdrop-blur-xs"
                      onClick={() => setShowWhat(false)}
                      aria-label="Close dialog"
                    >
                      <FontAwesomeIcon icon={faXmark} aria-hidden />
                      <span className="visually-hidden">Close</span>
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <p>
                    PropertyGuessr is a small, educational project that shows a
                    set of publicly listed homes and asks players to guess their
                    listed price. The homes displayed are gathered by a
                    background service that continuously finds public listing
                    pages and saves images and basic listing details to a pool
                    of examples the game can use.
                  </p>
                  <h3>How are homes selected?</h3>
                  <p>
                    A background job continually adds publicly available
                    listings to a shared pool. When you play, the game picks
                    randomly from that pool so each session shows a variety of
                    properties — no single listing is tracked just for the game.
                  </p>
                  <h3>Data sources & cadence</h3>
                  <p>
                    The project uses publicly available listing pages as its
                    source. A background job runs continuously to discover and
                    refresh listings for the pool; the game then samples from
                    that pool at play time. Because listings and prices are
                    frequently updated, game data may not reflect the most
                    recent changes on the original listing sites. If you notice
                    a listing in the game that no longer exists, please let me
                    know and I will remove it from the pool.
                  </p>
                  <h3>Privacy & disclaimers</h3>
                  <p>
                    This project only uses information that is publicly
                    available on listing pages. It does not collect or expose
                    private user data. The game is for entertainment/educational
                    use. Prices shown are taken from listing metadata and may
                    differ from final sale prices. The project is not affiliated
                    with any listing platform.
                  </p>
                  <h3>Questions or concerns?</h3>
                  <p>
                    If you have questions about the data or want a listing
                    removed from the pool, please use the Contact link to get in
                    touch.
                  </p>
                </div>
              </div>
            </div>,
            document.body
          )}
      </div>
    </div>
  );
}
