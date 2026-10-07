import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Michroma } from "next/font/google";
import "./globals.css";

const michroma = Michroma({ subsets: ["latin"], weight: "400", display: "swap" });

export const metadata: Metadata = {
  title: "ZAF TECH — Pi Ecosystem Observatory",
  description: "Independent, read-only observatory for Pi blockchain activity, ecosystem signals, and Web3 development data.",
  icons: { icon: [{ url: "/zaf-tech-logo.png", sizes: "512x512", type: "image/png" }], apple: "/zaf-tech-logo.png" },
};

export const viewport = { themeColor: "#f7f8fa", width: "device-width", initialScale: 1, viewportFit: "cover" as const };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="light bg-background"><head><style>{`
html { font-family: ${GeistSans.style.fontFamily}; --font-sans: ${GeistSans.variable}; --font-mono: ${GeistMono.variable}; --font-michroma: ${michroma.style.fontFamily}; }
`}</style></head><body>{children}</body></html>;
}
