"use client";

import { useState } from "react";

type Result = { type: string; title: string; detail: string; href: string };

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    const value = query.trim();
    if (value.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/zaf/search?q=" + encodeURIComponent(value), { cache: "no-store" });
      const data = await response.json();
      setResults(data.results ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-12 pt-8">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">ZAF TECH</div>
      <h1 className="mt-2 text-2xl font-bold text-foreground">Global Search</h1>
      <p className="mt-2 text-xs text-muted-foreground">Search currently observable apps, public sources, ecosystem signals and the latest ledger.</p>
      <div className="mt-5 flex gap-2">
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void search(); }} placeholder="Search apps, sources, signals or ledger…" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none" />
        <button type="button" onClick={() => void search()} className="rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background">{loading ? "Searching…" : "Search"}</button>
      </div>
      <div className="mt-4 space-y-2">
        {results.map(result => (
          <a key={result.type + result.title + result.detail} href={result.href} className="block rounded-xl border border-border bg-card p-3 hover:bg-muted">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{result.type}</div>
            <div className="mt-1 text-xs font-semibold text-foreground">{result.title}</div>
            <div className="mt-1 break-all text-[10px] text-muted-foreground">{result.detail}</div>
          </a>
        ))}
        {!loading && query.length >= 2 && !results.length ? <div className="rounded-xl border border-border p-4 text-[11px] text-muted-foreground">No observable matches.</div> : null}
      </div>
    </main>
  );
}
