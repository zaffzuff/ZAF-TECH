"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Viewport layer, independent of header/card layout and stacking contexts. */
export function ZafOverlay({ title, closeLabel, onClose, children }: {
  title: string; closeLabel: string; onClose: () => void; children: ReactNode;
}) {
  const id = useId();
  const panel = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`;
    const focusable = () => Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? []).filter(node => node.getClientRects().length > 0);
    (panel.current?.querySelector<HTMLElement>("[data-overlay-autofocus]") ?? panel.current)?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close.current(); }
      if (event.key !== "Tab") return;
      const items = focusable(), first = items[0], last = items[items.length - 1];
      if (!first) { event.preventDefault(); panel.current?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !panel.current?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.current?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown, true);
    return () => {
      document.removeEventListener("keydown", keydown, true);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="zaf-overlay-backdrop" onClick={event => { if (event.target === event.currentTarget) close.current(); }} onTouchMove={event => { if (event.target === event.currentTarget) event.preventDefault(); }}>
      <section ref={panel} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} className="zaf-overlay-panel">
        <div className="zaf-overlay-heading">
          <h2 id={id}>{title}</h2>
          <button type="button" onClick={() => close.current()} className="zaf-overlay-close" aria-label={closeLabel}>×</button>
        </div>
        <div className="zaf-overlay-body">{children}</div>
      </section>
    </div>, document.body,
  );
}
