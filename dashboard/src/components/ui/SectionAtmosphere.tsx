"use client";

import { useEffect, useState } from "react";
import FadingVideo from "./FadingVideo";

export const HERO_BACKGROUND_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260619_191346_9d19d66e-86a4-47f7-8dc6-712c1788c3b2.mp4";

export const OTHER_SECTIONS_BACKGROUND_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_093722_ccfc7ebf-182f-419f-8a62-2dc02db7dd9d.mp4";

export const FOOTER_BACKGROUND_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4";

interface SectionAtmosphereProps {
  videoSrc: string | string[];
  className?: string;
  withTopScrim?: boolean;
  withBottomScrim?: boolean;
  accentGlow?: boolean;
  opacity?: number;
  objectPosition?: string;
}

export default function SectionAtmosphere({
  videoSrc,
  className = "",
  withTopScrim = true,
  withBottomScrim = true,
  accentGlow = false,
  opacity = 1,
  objectPosition = "object-top",
}: SectionAtmosphereProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };
    mediaQuery.addEventListener("change", handleMotionChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none -z-10 bg-[#000000] ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      {/* ── Layer 1: Ambient Obsidian Foundation & Optional Accent Glow ── */}
      <div className="absolute inset-0 bg-[#000000]" />
      {accentGlow && (
        <>
          <div className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-accent-signal/8 rounded-full blur-[150px]" />
          <div className="absolute top-[50%] -right-[10%] w-[700px] h-[450px] bg-indigo-500/5 rounded-full blur-[140px]" />
        </>
      )}

      {/* ── Layer 2: Fading Video Looping Engine (Primary Color Graded Pass) ── */}
      {!reducedMotion && (
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            filter: "url(#voltage-grade)",
          }}
        >
          <FadingVideo
            src={videoSrc}
            className={`w-full h-full object-cover ${objectPosition}`}
          />
        </div>
      )}

      {/* ── Layer 3: Secondary Atmospheric Pass (Luminous depth & directional mask) ── */}
      {!reducedMotion && (
        <div
          className="absolute inset-0 w-full h-full opacity-35"
          style={{
            filter: "url(#voltage-grade2)",
            mixBlendMode: "plus-lighter",
            WebkitMaskImage:
              "linear-gradient(180deg, transparent 15%, #000 65%, #000 95%)",
            maskImage:
              "linear-gradient(180deg, transparent 15%, #000 65%, #000 95%)",
          }}
        >
          <FadingVideo
            src={videoSrc}
            className={`w-full h-full object-cover ${objectPosition}`}
          />
        </div>
      )}

      {/* ── Layer 4: Responsive Masking Scrims ── */}
      {/* Top Header Scrim */}
      {withTopScrim && (
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#000000]/95 via-[#000000]/60 to-transparent pointer-events-none" />
      )}

      {/* Peripheral Vignette Scrim */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 75% at 50% 35%, transparent 35%, rgba(0, 0, 0, 0.75) 75%, rgba(0, 0, 0, 0.95) 100%)",
        }}
      />

      {/* Bottom Grounding Scrim */}
      {withBottomScrim && (
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#000000] via-[#000000]/70 to-transparent pointer-events-none" />
      )}

      {/* ── Layer 5: Film Grain Micro-Texture ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.032] mix-blend-overlay"
        style={{
          filter: "url(#voltage-grain)",
        }}
      />
    </div>
  );
}
