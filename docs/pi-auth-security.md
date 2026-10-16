# Pi identity verification boundary

Reviewed October 16, 2026. ZAF Tech is public, free and read-only. Pi sign-in verifies a display name; it does not authorize private API access or create an application server session. Never use sessionStorage names as authorization. No payments, wallet scopes or extra login providers are introduced.

- Native Pi Browser: official SDK 2.0, initialize before host detection, username scope, send token to our same-origin verifier. Ordinary browsers retain the official Pi OAuth implicit flow; the portal SDK-exclusive declaration still needs final review rather than an assumed exemption.
- SDK load/init/authentication timeouts: operations have deadlines. A rejected init may retry; a non-settling init/permission prompt needs a fresh document via **Reload and retry**. The SDK has no assumed cancellation API. No second initialization is started over an unknown in-flight operation. Late credentials cannot win after timeout/unmount. Both responsive headers share a synchronous busy lock.
- Token verification: `GET https://api.minepi.com/v2/me`, bearer header, no-store, 10-second deadline. Production identity API overrides other than that exact HTTPS base are rejected; upstream redirects are errors. UID and username must be bounded, nonempty and free of whitespace/control characters. Return username only, never token/UID. Log only error classes, never payloads.
- Verifier requests: same-origin Origin required (the app's origin, not its Pi embedding ancestor), application/json, 8 KiB streamed body limit, 5-second body deadline, token max 4096 printable ASCII characters. No cross-origin or origin-less API client is supported by this browser-only endpoint.
- IP rate limit: 12/minute, database-backed when available. During database outage, per-instance local limiting preserves availability; it is not a distributed/global abuse guarantee. Proxy IP header integrity depends on the hosting platform. Pi upstream 429 is propagated with a validated Retry-After bounded to 1–300 seconds.
- Display storage: username + verification timestamp only. In-memory results from this document are marked verified; reload restores **Previously verified**, not a live session. A 30-minute display limit clears stale records on the next check (30-second timer, pageshow, initial read). Legacy unversioned string records are cleared on upgrade. This is display freshness, not an authorization expiry or token validity claim.
- OAuth: 24 random bytes of state, consumed once, local 10-minute age limit, reject future/missing age, mismatched/replayed/duplicate state and duplicate credential fields. Clear fragment before storage access. Preserve safe internal return path. No client secret or unsupported code/PKCE flow is invented.
- Browser storage failure must not turn a successfully verified native name into an authorization promise. Clear username removes ZAF display only; Pi global account consent/session remains managed by Pi.

## Validation and remaining gate

Readiness tests cover upstream errors/malformed identity, rate limits, streamed bodies, same-origin policy, state age/replay, native cancellation/retry, unmount, two header instances, late SDK completion and restored/expired display. These deterministic tests use controlled SDK/Pi fixtures and do not substitute for physical Pi Browser consent UI checks.

Owner reported mobile login/display/clear/reload/relogin succeeded on the previous release. The new release needs physical smoke testing, especially **deny once → retry → allow**. Developer account KYC is owner-confirmed. Domain verification, callback registration, branding, privacy/TOS, image sizes, language/category declarations and SDK-exclusive wording must be checked against the actual portal before final submission. No listing acceptance is guaranteed. tekyildiz.pi stays deferred.

**BEFORE FINAL APPLY FOR UNVERIFIED LISTING: REMIND THE OWNER IN CAPITALS TO UPGRADE THE MODEL, WAIT FOR THAT CHANGE, THEN DO THE COMPREHENSIVE FINAL REVIEW. DO NOT SUBMIT AS PART OF THIS HARDENING BATCH.**

Official sources:
- https://github.com/pi-apps/pi-platform-docs/blob/master/SDK_reference.md
- https://github.com/pi-apps/pi-platform-docs/blob/master/platform_API.md
- https://github.com/pi-apps/pi-platform-docs/blob/master/pi-sign-in.md
- https://developers.minepi.com/docs/build-first-app/MainnetListing (search excerpt available; direct page returned 502 during this review)
