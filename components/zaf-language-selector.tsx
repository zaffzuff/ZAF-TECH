"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/zaf/i18n";
import { localeLabels, translate } from "@/lib/zaf/i18n";

const locales: Locale[] = ["en", "es", "tr", "zh", "it", "fr", "de", "pt", "ru"];

function FlagIcon({ locale }: { locale: Locale }) {
  const flag = locale === "en" ? "gb" : locale === "es" ? "es" : locale === "tr" ? "tr" : locale === "zh" ? "cn" : locale === "it" ? "it" : locale === "fr" ? "fr" : locale === "de" ? "de" : locale === "pt" ? "pt" : "ru";

  return (
    <img
      src={`https://flagcdn.com/${flag}.svg`}
      alt=""
      width={20}
      height={14}
      className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover"
      aria-hidden="true"
    />
  );
}

export function LanguageSelector({
  locale,
  onChange,
  className = "",
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const ordered = [...locales].sort((a, b) => localeLabels[a].localeCompare(localeLabels[b], "en"));
  useEffect(() => {
    if (open) ref.current?.querySelector<HTMLButtonElement>('[role="option"][aria-selected="true"]')?.focus();
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`} onKeyDown={event => {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); return; }
      if (event.key === "Tab") { setOpen(false); return; }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      const options = [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])];
      const current = options.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
      options[next]?.focus();
    }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={translate(locale, "Language", "Dil")}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-medium text-foreground"
      >
        <FlagIcon locale={locale} />
        <span>{localeLabels[locale]}</span>
        <span className="ml-0.5 text-[10px]">⌄</span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={translate(locale, "Language", "Dil")}
          className="absolute right-0 z-50 mt-1 min-w-[118px] overflow-hidden rounded-lg border border-border bg-card p-1 shadow-lg"
        >
          {ordered.map(option => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={locale === option}
              onClick={() => {
                onChange(option);
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs ${locale === option ? "bg-muted font-semibold text-foreground" : "text-foreground hover:bg-muted"}`}
            >
              <FlagIcon locale={option} />
              <span>{localeLabels[option]}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
