import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Michroma } from "next/font/google";
import "./globals.css";

const michroma = Michroma({ subsets: ["latin"], weight: "400", display: "swap" });

export const metadata: Metadata = {
  title: "ZAF Tech — Pi Ecosystem Observatory",
  description: "Independent, read-only technology layer for observable Pi Network ecosystem data.",
  icons: { icon: [{ url: "/zaf-tech-logo.png", sizes: "512x512", type: "image/png" }], apple: "/zaf-tech-logo.png" },
};

export const viewport = { themeColor: "#f7f8fa", width: "device-width", initialScale: 1, viewportFit: "cover" as const };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background">
      <head>
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
              var dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
              document.documentElement.classList.toggle("dark", dark);
              document.documentElement.classList.toggle("light", !dark);
            }
          })();
        ` }} />
        <style>{`
html { font-family: ${GeistSans.style.fontFamily}; --font-sans: ${GeistSans.variable}; --font-mono: ${GeistMono.variable}; --font-michroma: ${michroma.style.fontFamily}; }
`}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
