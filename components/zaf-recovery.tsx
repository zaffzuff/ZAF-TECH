"use client";

import { useEffect } from "react";
import { markAppReady } from "@/lib/zaf/startup-guard";

export function ZafRecovery({ reset }: { reset: () => void }) {
  useEffect(() => { markAppReady(); }, []);
  return <main data-zaf-recovery className="mx-auto max-w-lg px-5 py-12">
    <h1 className="text-2xl font-semibold">ZAF Tech</h1>
    <p className="mt-4">The page could not start. Please reload or open the browser check.</p>
    <p className="mt-2">Sayfa başlatılamadı. Yeniden yükleyebilir veya tarayıcı kontrolünü açabilirsin.</p>
    <p className="mt-3 text-sm">ZAF-RENDER</p>
    <div className="mt-5 flex flex-wrap gap-4">
      <button type="button" onClick={reset} className="rounded-lg border px-3 py-2">Retry / Tekrar dene</button>
      <a href="/?zaf_retry=1" className="rounded-lg border px-3 py-2">Reload / Yenile</a>
      <a href="/browser-check.html" className="rounded-lg border px-3 py-2">Browser check / Tarayıcı kontrolü</a>
    </div>
  </main>;
}
