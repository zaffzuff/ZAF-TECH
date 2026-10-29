import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Michroma } from "next/font/google";
import "./globals.css";
import { startupGuardScript } from "@/lib/zaf/startup-guard";

const michroma = Michroma({ subsets: ["latin"], weight: "400", display: "swap" });

export const metadata: Metadata = {
  title: "ZAF Tech — Pi Ecosystem Observatory",
  description: "Independent, read-only technology layer for observable Pi Network ecosystem data.",
  icons: { icon: [{ url: "/zaf-tech-logo.png?v=20261016", sizes: "1254x1254", type: "image/png" }], apple: "/zaf-tech-logo.png?v=20261016" },
};

export const viewport = { themeColor: "#f7f8fa", width: "device-width", initialScale: 1, viewportFit: "cover" as const };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: startupGuardScript }} />
        <script id="zaf-pi-sdk" src="https://sdk.minepi.com/pi-sdk.js" async />
        <script dangerouslySetInnerHTML={{ __html: `
          (function () {
            // Pi Browser 1.17.x can use an older WebView than current Safari.
            // Install tiny standards-only fallbacks before the React bundle runs
            // so the observatory does not turn into a blank screen after data loads.
            if (!Array.prototype.at) {
              Array.prototype.at = function (index) {
                var position = Math.trunc(index) || 0;
                if (position < 0) position += this.length;
                return this[position];
              };
            }
            if (!Array.prototype.flatMap) {
              Array.prototype.flatMap = function (callback, thisArg) {
                return Array.prototype.concat.apply([], this.map(callback, thisArg));
              };
            }
            if (!Promise.allSettled) {
              Promise.allSettled = function (items) {
                return Promise.all(Array.from(items, function (item) {
                  return Promise.resolve(item).then(
                    function (value) { return { status: "fulfilled", value: value }; },
                    function (reason) { return { status: "rejected", reason: reason }; },
                  );
                }));
              };
            }
            try {
              var saved = localStorage.getItem("zaf-tech-theme-v1");
              var dark = saved === "dark" || (saved !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
              document.documentElement.classList.toggle("dark", dark);
              document.documentElement.classList.toggle("light", !dark);
            } catch (_) {
              var dark = false;
              try { dark = typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches; } catch (_) {}
              document.documentElement.classList.toggle("dark", dark);
              document.documentElement.classList.toggle("light", !dark);
            }
            // Keep browser chrome in the selected theme, including after route metadata updates.
            function syncThemeChrome() {
              var color = document.documentElement.classList.contains("dark") ? "#1a1b22" : "#f7f8fa";
              document.querySelectorAll('meta[name="theme-color"]').forEach(function (meta) {
                if (meta.getAttribute("content") !== color) meta.setAttribute("content", color);
              });
            }
            if (typeof MutationObserver === "function") {
              new MutationObserver(syncThemeChrome).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
              new MutationObserver(syncThemeChrome).observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ["content"] });
            }
            syncThemeChrome();
          })();
        ` }} />
        <style>{`
html { font-family: ${GeistSans.style.fontFamily}; --font-sans: ${GeistSans.variable}; --font-mono: ${GeistMono.variable}; --font-michroma: ${michroma.style.fontFamily}; }
`}</style>
      </head>
      <body>
        <div id="zaf-startup-help" hidden role="status" style={{ position: "fixed", inset: 0, zIndex: 2147483647, padding: "32px 20px", background: "#f7f8fa", color: "#242833", fontFamily: "Arial, sans-serif", overflow: "auto" }}>
          <h1 style={{ color: "#987020" }}>ZAF Tech</h1>
          <p>The page is taking longer than expected to start.</p>
          <p>Sayfanın açılması beklenenden uzun sürüyor.</p>
          <p id="zaf-startup-code">ZAF-BOOT</p>
          <p><a id="zaf-startup-retry" href="/?zaf_retry=1">Reload / Yenile</a></p>
          <p><a href="/browser-check.html">Browser check / Tarayıcı kontrolü</a></p>
        </div>
        {children}
      </body>
    </html>
  );
}
