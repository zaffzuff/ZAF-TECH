# Published app entry and startup maintenance — 2026-10-29

The owner's published App Studio entry is `https://zaftechpu0455.pinet.com`. All native-entry help, storage-bootstrap redirects, form policies and exact recovery-frame policies now use that fixed trusted origin. No request parameter controls the destination. The separate Developer Portal registration was not deleted or reconfigured.

## Findings and changes

- Removed the retired entry from executable code and updated native/web entry and storage-transport regressions. Account-verification sources and identity separation are unchanged.
- Added an ES5, storage-free observatory startup notice before React. A missing application script or a 15-second startup stall exposes a manual reload/check action. SDK-only failures cannot cover a working app. No exception text, credentials, telemetry, automatic navigation or reload loop is introduced. Policy and OAuth callback routes do not run the observatory timer.
- Added React and root-layout error boundaries, guarded optional media-query/MutationObserver APIs, and supported legacy media-query listeners with cleanup.
- Patched Next.js 15.5.27 to 15.5.28. The official advisories identify 15.5.28 as patched for [image optimization RCE](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) and [Server Actions DoS](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r). Dependency findings do not establish that this app was exploited or that its white screen came from those vulnerabilities.
- Extended CI to the branch used by the currently published code, retained master checks, added lint/type checks, and included new startup/mobile-update behavior tests in the release suite. Automatic Vercel Git deployment remains disabled.

## Verification

- All 182 Node behavior tests passed, without skips. Coverage includes native/web identity verification, session expiry/races, blocked storage, page-memory transport, origin rejection, checker SSRF protections, news/history/wallet failure states, and seven startup/theme tests.
- Regression checks and TypeScript passed. Production build passed on Next.js 15.5.28.
- ESLint completed with **0 errors and 15 pre-existing warnings**. These warnings concern unused values, error causes, a regex escape and a broad database type; they are retained as explicit technical debt. The build also notes that the Next ESLint plugin is not configured. This is not a claim of a warning-free or exhaustive security audit.
- Post-patch npm audit: **0 known vulnerabilities** across all severity levels at test time.
- Production-build HTTP smoke passed: public/policy/callback/diagnostic pages, security headers, fixed storage redirect, anonymous session, invalid requests, unauthorized cron and foreign-origin rejection.
- Isolated Edge Chromium browser checks covered five primary sections at 1440 and 390 CSS pixels after data loading, five supporting routes at both widths, SDK unavailability, application-bundle failure, restricted display storage/missing matchMedia, and a real native recovery form submission. No horizontal overflow or uncaught app exception was observed. Chromium narrow-screen checks are not physical iOS/Android tests.

## Still open

The iPhone 11 is unavailable until evening. Its Pi Browser white screen, including the owner's report that the standalone diagnostic also fails in Safari over Wi-Fi and cellular, has **no verified cause or resolution**. The published App Studio address wraps the Vercel source in a PiNet iframe. A fallback cannot render if the underlying HTML itself does not reach the device.

Changes are prepared on `codex/iphone-pi-browser-startup`, based on the current production commit `4a3fb8541cb8bf85bed2dffb87f3d033cdddf10b`. Local test success is not a production rollout or a completed device test. No Pi app record, wallet, review, stake, permission, node setting or final Ecosystem Listing submission is changed.
