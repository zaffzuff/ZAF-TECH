# Pi Browser direct-entry recovery — 2026-10-19

Production baseline: 3393fee827c4e3083ac1a9e09f92c68d22ee55ce on Vercel project zaf-tech. The default master branch is older and must not replace this production baseline.

The owner's screenshot shows ZAF-PI-502 after native authentication. In this baseline that status means the server-side App Studio exchange failed, returned non-success, or returned an invalid profile/session token. Same-origin rejection is 403; missing session configuration is 503. Exact upstream cause is unconfirmed: the reported attempt is outside available Vercel Hobby runtime-log retention. A recent 50-minute Pi log query returned no records.

The public registered PiNet page embeds the same Vercel frontend and identifies the published ZAF Tech app. The registrations for Developer Portal web OAuth and App Studio native authentication are separate. Native tokens must not be retried through the web OAuth verifier or trusted from client profile data.

Changes: after SDK identifies a native host, recheck top-level entry even for generic iOS user agents. Offer the fixed registered PiNet entry on native HTTP 502. Canonical entry links navigate the top-level browser so they cannot open a nested Pi shell. No automatic redirect; no token is carried in the link. Preserve existing framed native verification and ordinary-browser OAuth.

Validation: production build passed; 51 native-entry/session/storage tests and 53 readiness tests passed; git diff --check passed. These are deterministic tests, not physical-device proof.

Limitations: authenticated App Studio/Developer Portal settings were not accessible in this browser session. No domains, origins, environment values, scopes or portal settings were changed. The session-secret variable exists in production metadata; its content was not retrieved. A physical iPhone 11 test must open both URLs, use the recovery entry if shown, then confirm sign-in, 60 seconds of session retention, refresh/Resume session, and logout/relogin. The underlying upstream rejection still requires a fresh attempt and immediate runtime-log inspection if it persists.
