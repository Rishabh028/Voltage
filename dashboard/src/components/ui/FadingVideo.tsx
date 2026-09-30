"use client";

import { useEffect, useRef, useState, CSSProperties } from "react";

interface FadingVideoProps {
  src: string | string[];
  className?: string;
  style?: CSSProperties;
  onCanPlay?: () => void;
  onTimeUpdate?: () => void;
}

export default function FadingVideo({
  src,
  className = "",
  style = {},
  onCanPlay,
  onTimeUpdate,
}: FadingVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [opacity, setOpacity] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isFadingOutRef = useRef(false);
  const isFadingInRef = useRef(false);

  const sources = Array.isArray(src) ? src : [src];
  const currentSrc = sources[currentIndex % sources.length];

  // Fade In over 500ms using requestAnimationFrame
  const fadeIn = (duration = 500) => {
    isFadingInRef.current = true;
    isFadingOutRef.current = false;
    const start = performance.now();
    const initialOpacity = opacity;

    const animate = (time: number) => {
      if (!isFadingInRef.current) return;
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      const currentVal = initialOpacity + (1 - initialOpacity) * progress;
      setOpacity(currentVal);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        isFadingInRef.current = false;
      }
    };

    requestAnimationFrame(animate);
  };

  // Fade Out over 550ms using requestAnimationFrame
  const fadeOut = (duration = 550, onComplete?: () => void) => {
    if (isFadingOutRef.current) return;
    isFadingOutRef.current = true;
    isFadingInRef.current = false;
    const start = performance.now();
    const initialOpacity = opacity;

    const animate = (time: number) => {
      if (!isFadingOutRef.current) return;
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      const currentVal = initialOpacity * (1 - progress);
      setOpacity(currentVal);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        isFadingOutRef.current = false;
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animate);
  };

  const handleLoadedData = () => {
    fadeIn(500);
    if (onCanPlay) onCanPlay();
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && video.duration) {
      const remainingTime = video.duration - video.currentTime;
      // When remaining time <= 0.55s, fade out
      if (remainingTime <= 0.55 && !isFadingOutRef.current && opacity > 0.05) {
        fadeOut(550);
      }
    }
    if (onTimeUpdate) onTimeUpdate();
  };

  const handleEnded = () => {
    const video = videoRef.current;
    if (sources.length > 1) {
      // Advance to next index (cycling)
      setCurrentIndex((prev) => (prev + 1) % sources.length);
    } else if (video) {
      // Single source: reset currentTime to 0, replay, fade back in
      video.currentTime = 0;
      video.play().catch(() => {});
      fadeIn(500);
    }
  };

  // When currentSrc changes in cycling mode, load and play
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.src = currentSrc;
      video.load();
      video.play().catch(() => {});
    }
  }, [currentSrc]);

  return (
    <video
      ref={videoRef}
      className={className}
      style={{
        ...style,
        opacity,
        transition: "none", // Managed via requestAnimationFrame
      }}
      autoPlay
      muted
      playsInline
      preload="auto"
      onLoadedData={handleLoadedData}
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleEnded}
    >
      <source src={currentSrc} type="video/mp4" />
    </video>
  );
}
