# Pre-Pi integration verification

The observatory remains read-only. Username sign-in verifies a Pi token through the server's `/me` request and displays the verified username; stored display state is not an authenticated application session. Do not authorize protected APIs from a browser-stored username.

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
3. On an actual iPhone, record iOS and Pi Browser versions. Test native sign-in, cancellation, retry, sign-out, normal Safari OAuth, blocked storage and poor connectivity. Never record tokens, wallet passphrases, or secret variable values in test evidence.
4. Verify scheduled collection wrote a new history record after deployment. Five minutes is the news cache duration; unattended collection is daily, not every five minutes.
5. Treat missing public directory records and empty baselines as coverage limitations. Reachable source pages do not imply complete app data.
6. Node/Compute uses a local Connector. A phone's localhost is the phone, not the user's desktop. Remote node reporting needs a separately designed authenticated transport.
7. Before personalized writes, implement a server-authenticated session and authorization. Before payments, implement server approve/complete, pending payment reconciliation, idempotency, and Testnet checks. The current username-only flow does not prove payment readiness.

## Operations

Check news last-success time, source failures and newest stored observation weekly and after each release. Inspect SDK/official-source changes as they occur. Database-backed rate limits are shared across instances; the bounded memory fallback protects only a single instance. This audit does not add external alert delivery or prove a production scheduled run.
