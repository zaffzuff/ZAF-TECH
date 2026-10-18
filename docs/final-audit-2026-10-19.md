# ZAF Tech final web/mobile audit — 19 October 2026

Scope: core web/mobile flows, supporting pages, public observations, wallet tools, native/App Studio and web OAuth verification, sessions, local Connector trust boundaries, CI and deployment configuration. This is an evidence-based review, not a guarantee that every device, provider failure or future release is bug-free.

## Confirmed defects corrected

| Area | Trigger and resulting behavior |
|---|---|
| Session restoration | A valid encrypted cookie was ignored after reload. Both headers now share server session reconciliation on mount, page resume and every 30 seconds, with guards against late responses overwriting login/logout. Missing cookies clear presentation; transport failures show historical verification only. Polling never extends the server cookie expiry. |
| Search | Typing before submission displayed a false empty result; editing a successful query retained old results. Only the submitted current query can display results, and superseded requests are cancelled/ignored. |
| App health | Rate limits/transport errors could fabricate Offline, No HTTPS or undefined response times. Checker failure is separate from target health. URL edits and history requests cannot display obsolete results. |
| Wallet | Failed subrequests previously appeared as zero/no activity. Each source now reports availability; unknown observations remain unknown while valid account data survives. Claim predicates use the matching claimant and correct BEFORE/NOT semantics. Custom assets are not labelled Pi; checksum validation and stable asset keys were added. |
| DeFi | Partial source failure could poison stored baselines and create false changes. Only complete canonical samples participate in snapshots/alerts. History database failures preserve live observations; client live/history requests are independent. |
| Historical pace | Counts included N ledgers but elapsed time covered N−1 intervals, biasing partial buckets. Only full observed ledger intervals are counted. JSON body consumption remains inside request deadlines; failed history responses are not cached as successes. |
| UI semantics | Wallet navigation removes stale subtab parameters. Supporting page language is declared, three incorrect translations are corrected, and all newly introduced error messages have supplemental translations. |
| Local Connector | Foreign Host/Origin requests are rejected before diagnostics, closing the DNS rebinding boundary. This source change does not retroactively update installed executables. |
| Safeguards | The regression checker now expects the separate web OAuth verifier, and the new behavioral test suite is included in web CI. |

## Verification

- 54 readiness/security tests, 12 official news tests and 40 additional behavioral tests passed (106 total).
- Production build and TypeScript passed. Regression and local HTTP smoke checks passed.
- Production-only and complete npm audit reported zero known vulnerabilities in the installed locked dependency set at review time.
- Browser: all 25 main/subtab views inspected at 360 CSS px and 1440 CSS px, with no horizontal overflow, blank view or broken image detected in those states. About, Privacy, Terms and Start Pi also checked at both widths.
- Nine language choices verified in the mobile wallet surface; document language and translated headings updated without overflow. Terms and Start Pi retain their intentionally limited language coverage.
- Search stale-results fix and Explorer → Wallet URL fix verified in the browser. Offline refresh showed an explicit retry state; connectivity was restored after the test.
- Tests with controlled failures cover checker rate limits, malformed responses, request races, wallet partial failures, claim predicates, native/web verifier separation, session expiry/races and local Connector rejection. Fixtures are not represented as successful real third-party requests.
- Environment metadata was checked without decrypting secrets: production session/database/cron credentials are sensitive, and the OAuth client ID is public configuration. No environment, domain, blockchain network or portal configuration was changed.

## Release boundaries

- The owner confirmed real web QR sign-in succeeded on the preceding fix. Real Pi Desktop/App Studio sign-in also succeeded earlier in this task. New reconciliation code is covered by deterministic tests; a final physical Pi Browser refresh/logout/relogin remains a release smoke check.
- The public ecosystem directory source can be reachable while exposing no app records. This is explicitly displayed; no records or third-party app checks are fabricated.
- Native/App Studio and Developer Portal OAuth identities remain separate; future Pro/paid entitlements require an explicit account-linking design. No payment scope, wallet integration or paid feature was added.
- Existing packaged/installed Connector binaries must receive a separately built update to include the source security fix. No existing release/tag was deleted and no running local Node setting was changed.
- App Studio displayed Published after the owner selected Continue and Skip. This does not establish ecosystem directory acceptance. The older Developer Portal record is not assumed to be the same application identity.
- Formal listing declarations and final submission remain distinct from deploying this tested web maintenance release.

## Physical smoke follow-up

The owner confirmed canonical https://zaftechpu0455.pinet.com native Pi Browser sign-in and direct web QR sign-in succeed. Direct Vercel navigation in mobile Pi Browser stalled. A bounded entry fix now avoids attempting parent-bridge consent from a known top-level Pi Browser page, provides the fixed registered app entry, and routes pi-net web host through web OAuth. This entry handling needs owner confirmation after deployment; the prior mock suites did not establish this real environment boundary. No verifier, consent scope or identity trust was weakened.
