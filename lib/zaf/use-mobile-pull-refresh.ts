"use client";

import { useEffect, useRef, useState } from "react";

/** Refresh observations, not the document: native Pi page sessions stay alive. */
export function useMobilePullRefresh(refresh: () => Promise<void>) {
  const target = useRef<HTMLElement>(null);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    const element = target.current;
    if (!element) return;
    let start: { x: number; y: number } | null = null, pull = 0, pending = false;
    const reset = () => { start = null; pull = 0; if (!pending) setDistance(0); };
    const touchstart = (event: TouchEvent) => {
      reset();
      if (pending || event.touches.length !== 1 || !window.matchMedia("(max-width: 1023px)").matches || window.scrollY > 1 || document.querySelector('[role="dialog"]')) return;
      if ((event.target as Element | null)?.closest('button,a,input,textarea,select,[role="dialog"],[data-no-pull-refresh]')) return;
      start = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    };
    const touchmove = (event: TouchEvent) => {
      if (!start) return;
      if (event.touches.length !== 1 || window.scrollY > 0) { reset(); return; }
      const dx = event.touches[0].clientX - start.x, dy = event.touches[0].clientY - start.y;
      if (Math.abs(dx) > Math.max(16, dy) || dy < 0) { reset(); return; }
      if (dy > 10 && event.cancelable) event.preventDefault();
      pull = Math.min(120, Math.max(0, dy - 24) * 0.65);
      setDistance(pull);
    };
    const touchend = () => {
      const trigger = start && pull >= 80 && !pending;
      start = null;
      if (!trigger) { reset(); return; }
      pending = true; setRefreshing(true); setDistance(80);
      void refresh().catch(() => undefined).finally(() => { pending = false; setRefreshing(false); reset(); });
    };
    element.addEventListener("touchstart", touchstart, { passive: true });
    element.addEventListener("touchmove", touchmove, { passive: false });
    element.addEventListener("touchend", touchend);
    element.addEventListener("touchcancel", reset);
    return () => {
      element.removeEventListener("touchstart", touchstart);
      element.removeEventListener("touchmove", touchmove);
      element.removeEventListener("touchend", touchend);
      element.removeEventListener("touchcancel", reset);
    };
  }, [refresh]);
  return { target, distance, refreshing };
}
