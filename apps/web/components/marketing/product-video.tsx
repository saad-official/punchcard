"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * The 28-second product preview (rendered with Remotion from the shared tokens). Muted autoplay
 * loop, except under prefers-reduced-motion: then the poster shows with a play button. The
 * server render assumes reduced motion, so nothing autoplays before the preference is known.
 */
export function ProductVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const reduced = useSyncExternalStore(subscribe, () => window.matchMedia(REDUCED_MOTION).matches, () => true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (reduced) video.pause();
    else video.play().catch(() => {});
  }, [reduced]);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  return (
    <figure>
      <div className="relative overflow-hidden rounded-lg border border-line-strong bg-charcoal shadow-lg">
        <video
          ref={ref}
          className="block aspect-video w-full"
          src="/video/punchcard.mp4"
          poster="/video/punchcard-poster.jpg"
          autoPlay={!reduced}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="Punchcard product preview: one tap starts the clock, the timer and earnings count up, and the running job appears on the Lock Screen, a Home Screen widget and an Android Live Update."
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        {playing ? (
          <button
            type="button"
            onClick={toggle}
            className="absolute right-3 bottom-3 flex size-11 items-center justify-center rounded-full bg-charcoal/80 text-paper ring-1 ring-white/20"
            aria-label="Pause the product preview"
          >
            <Pause aria-hidden className="size-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={toggle}
            className="absolute inset-0 m-auto flex h-14 w-fit items-center gap-2 rounded-full bg-accent px-6 text-[17px] font-bold text-on-accent shadow-lg"
          >
            <Play aria-hidden className="size-5 fill-current" />
            Play preview
          </button>
        )}
      </div>
      <figcaption className="mt-3 text-caption text-ink-muted">
        Product preview: screens recreated from the app&apos;s design system.
      </figcaption>
    </figure>
  );
}
