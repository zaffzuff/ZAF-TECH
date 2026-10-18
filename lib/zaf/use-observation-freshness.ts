"use client";

import { useEffect, useState } from "react";
import { observationFreshness } from "./freshness";

export type LiveObservationFreshness = Omit<ReturnType<typeof observationFreshness>, "state"> & {
  state: "fresh" | "aging" | "stale" | "unknown";
  ready: boolean;
};

/** One clock drives the banner and all dashboard cards, including after tab resume. */
export function useObservationFreshness(closedAt: string | null | undefined, failed: boolean): LiveObservationFreshness {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 15_000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("pageshow", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("pageshow", tick);
    };
  }, []);
  const evidence = observationFreshness(closedAt, now ?? 0);
  return { ...evidence, state: failed ? "stale" : evidence.state, ready: now !== null };
}
