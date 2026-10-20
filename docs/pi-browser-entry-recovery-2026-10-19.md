# Pi Browser direct-entry recovery — 2026-10-19

Production baseline: 3393fee827c4e3083ac1a9e09f92c68d22ee55ce on Vercel project zaf-tech. The default master branch is older and must not replace this production baseline.

The owner's screenshot shows ZAF-PI-502 after native authentication. In this baseline that status means the server-side App Studio exchange failed, returned non-success, or returned an invalid profile/session token. Same-origin rejection is 403; missing session configuration is 503. Exact upstream cause is unconfirmed: the reported attempt is outside available Vercel Hobby runtime-log retention. A recent 50-minute Pi log query returned no records.

The public registered PiNet page embeds the same Vercel frontend and identifies the published ZAF Tech app. The registrations for Developer Portal web OAuth and App Studio native authentication are separate. Native tokens must not be retried through the web OAuth verifier or trusted from client profile data.

Changes: after SDK identifies a native host, recheck top-level entry even for generic iOS user agents. Offer the fixed registered PiNet entry on native HTTP 502. Canonical entry links navigate the top-level browser so they cannot open a nested Pi shell. No automatic redirect; no token is carried in the link. Preserve existing framed native verification and ordinary-browser OAuth.

Validation: production build passed; 51 native-entry/session/storage tests and 53 readiness tests passed; git diff --check passed. These are deterministic tests, not physical-device proof.

Limitations: authenticated App Studio/Developer Portal settings were not accessible in this browser session. No domains, origins, environment values, scopes or portal settings were changed. The session-secret variable exists in production metadata; its content was not retrieved. A physical iPhone 11 test must open both URLs, use the recovery entry if shown, then confirm sign-in, 60 seconds of session retention, refresh/Resume session, and logout/relogin. The underlying upstream rejection still requires a fresh attempt and immediate runtime-log inspection if it persists.

## 2026-10-20: Resume / storage white-screen recovery

Owner reports Resume session reaches /signin/storage and remains white in native Pi Browser. Live GET returned 200 HTML but X-Frame-Options: DENY and CSP frame-ancestors none. A desktop same-origin iframe check reproduced a blank child document. The exact physical device ancestor chain has not been captured in this run.

The anonymous GET recovery page now permits only self and the fixed known Pi native shell, registered PiNet app and App Studio shell origins. Its default is useful even without JavaScript: a fixed user-activated PiNet recovery link. A CSP-hashed script exposes the first-party preparation form only when window.parent === window. The POST bootstrap keeps DENY, frame-ancestors none and strict Origin validation. GET sets no cookies, handles no identity and never auto-redirects or grants storage access. The sign-in storage help also offers the registered app directly.

This supersedes the earlier blanket statement that all /signin/storage responses must be unframeable; only the POST remains first-party-only. Authentication APIs, session encryption, cookie attributes, scopes and providers are unchanged.

Validation: 104 focused entry/storage/session/readiness tests passed, including fixed ancestor allowlist, exact inline-script CSP hash, embedded fallback, top-level form gating, foreign/null Origin rejection and no unverified display. Production build passed. Physical device Resume and cookie retention still need owner retest; this change does not claim the underlying iOS storage permission limitation or native upstream 502 is resolved.
