# Pre-Pi integration verification

The observatory remains read-only. Username sign-in verifies a Pi token through the server's `/me` request and displays the verified username; stored display state is not an authenticated application session. Do not authorize protected APIs from a browser-stored username.

## Scope confirmed October 15

ZAF Tech is free, not for profit, and accepts no user payments. Payment integration and payment credentials are out of scope. Public observations remain available without sign-in on iOS, Android and desktop web. No personalized write endpoints currently require an application session; add server authentication/authorization before introducing such features in the later Pi integration phase.

The owner's reference device is iPhone 8 Plus with Pi Browser 1.17.1, not the sole supported platform. Verify 414×736 for that reference, 360 px Android, larger iOS, tablet and desktop widths. Browser viewport tests do not prove real Safari/Android/Pi Browser behavior. Record real OS versions during the integration test.

Protocol capability and activation are separate observations. Mainnet's current ledger protocol and Horizon/Core supported protocol are displayed independently from public JSON. Mixed 27/28 samples, protocol-28 image tags and unfamiliar operation names have regression coverage. Connector source prioritizes the active ledger version, handles null/unknown protocols, and shares one implementation across CJS/ESM entry points. This does not upgrade a user's Node or update an installed Windows binary.

Phones skip local Connector queries and explain the desktop requirement; public network views remain usable. A failed Mainnet refresh retains the last in-memory successful sample as stale, without saving it as a new historical measurement. Older browser colors have an sRGB fallback.

## Verified in the October 14 audit

- Desktop/mobile navigation across all dashboard sections and supporting pages; 390×844 browser viewport is representative, not an actual iPhone/WKWebView test.
- Ledger search updates the selected Network view; Back restores the previous section.
- Wallet inputs/network changes cancel outdated lookups and clear previous results.
- Rejected URL checks and rate-limited requests show request errors instead of fabricated offline measurements.
- Radar and ecosystem changes reuse the main collected observation; historical comparison skips the just-saved current observation.
- Public URL checks reject non-public DNS results, pin the approved address, and do not follow redirects.
- Callback fragments are cleared before storage access; unsafe return paths are rejected.
- Mainnet/Sandbox compatibility, request cancellation/deadlines, DNS pinning, rate-limit fallback, amount units, and Pi auth routing have behavioral tests.

## Release gates

1. Run `npm run test:news`, `npm run test:readiness`, `npm run regression`, `npm run build`, and smoke checks against that build.
2. In Pi Developer Portal, match the app network, hosted URL, and OAuth callback/client registration. Rebuild when changing SDK mode: the client receives the selected mode at build time. Use a separate Testnet app for Sandbox; only the official Sandbox origin is allowed to frame that build.
3. During the subsequent Pi integration phase, test actual iOS and Android Pi Browser sign-in/cancellation/retry/sign-out and Safari/Chrome OAuth. The reference iPhone is 8 Plus / Pi Browser 1.17.1. Never record tokens, wallet passphrases, or secret variable values in test evidence.
4. Verify scheduled collection wrote a new history record after deployment. Five minutes is the news cache duration; unattended collection is daily, not every five minutes.
5. Treat missing public directory records and empty baselines as coverage limitations. Reachable source pages do not imply complete app data.
6. Node/Compute uses a local Connector. A phone's localhost is the phone, not the user's desktop. Remote node reporting needs a separately designed authenticated transport.
7. Keep public read-only access free and optional sign-in separate. Payment features are excluded. Server sessions become required only if the later integration introduces personalized writes or protected data.

## Operations

The protected daily collection persists a small monitor checkpoint with source availability and whether history was actually stored. `/api/zaf/status` reads that checkpoint and the most recent history record without triggering collection, exposing no credentials or user identity. No scheduled record is reported as unknown; more than 36 hours since a daily run is overdue. Verify the first real scheduled checkpoint after release.

Daily Codex heartbeat at 10:00 Europe/Istanbul checks meaningful failures/protocol changes and stays quiet otherwise. Sunday 19:00 reminds the owner to review maintenance together. The app's scheduled collection remains daily at 03:00 UTC. These reminders do not merge or deploy automatically.

Automatic Git deployments are disabled in `vercel.json` to conserve quota. Publish reviewed batches manually once, with the exact tested production commit and production environment. GitHub test workflows still run. Do not enable preview deployments during routine development without reviewing the quota impact.

Database-backed rate limits are shared across instances; the bounded memory fallback protects only a single instance. App-directory HTML currently lacks public records; preserve unknown coverage and provide a link to the official directory instead of scraping authenticated user data.
