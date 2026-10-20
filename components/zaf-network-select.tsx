"use client";

import { useEffect, useRef, useState } from "react";

export function ZafNetworkSelect({ value, onChange, label }: {
  value: "mainnet" | "testnet";
  onChange: (value: "mainnet" | "testnet") => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return <div ref={root} className="zaf-network-select" onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    if (event.key === "Tab") setOpen(false);
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (!open) { setOpen(true); return; }
    const options = [...(root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])];
    const index = options.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
    options[next]?.focus();
  }}>
    <button ref={trigger} type="button" className="zaf-network-select-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
      <span>{value === "mainnet" ? "Pi Mainnet" : "Pi Testnet"}</span><span aria-hidden="true">⌄</span>
    </button>
    {open ? <div role="listbox" aria-label={label} className="zaf-network-options">
      {(["mainnet", "testnet"] as const).map(network => <button key={network} type="button" role="option" aria-selected={value === network} onClick={() => {
        onChange(network); setOpen(false); trigger.current?.focus();
      }}>{network === "mainnet" ? "Pi Mainnet" : "Pi Testnet"}<span aria-hidden="true">{value === network ? "✓" : ""}</span></button>)}
    </div> : null}
  </div>;
}
