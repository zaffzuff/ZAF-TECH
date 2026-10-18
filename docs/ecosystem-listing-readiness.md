# ZAF Tech listing preparation — October 16, 2026

## MANDATORY FINAL GATE

**SON BAŞVURUDAN ÖNCE DUR: KULLANICIYA MODELİ YÜKSELTMESİNİ BÜYÜK HARFLERLE HATIRLAT. MODEL DEĞİŞİKLİĞİNİ KULLANICI YAPTIKTAN SONRA KAPSAMLI SON TESTİ VE BAŞVURU İNCELEMESİNİ TAMAMLA. SONUÇLAR GÖRÜLMEDEN APPLY FOR UNVERIFIED LISTING İŞLEMİNE GEÇME.**

No listing application has been submitted. Prepared images have not been uploaded. Do not confuse configuration Submit/Save with the final application.

## October 18 status update

App Studio integration is deployed, but native sign-in currently fails at the App Studio exchange (observed upstream HTTP 404). Do not mark the auth gate complete from mocked tests. The official production frontend separately implements ownership verification/conversion and publication: Verify My App checks the static claim, creates the converted app and waits for a successful native sign-in; the verified screen then offers Publish and states that remaining unlisted is possible. Technical verification may therefore be needed to finish the login test before public listing. No Verify/Publish action has been taken by the agent.

Current auth behavior is documented in pi-auth-security.md. The October 16 display-only/session/CSP and device evidence below is historical and superseded where it conflicts. Keep the mandatory final review gate above.

## Product and technical preparation

1. Data: ledger closure determines freshness, not successful request time. Status ages on screen; stale samples are never saved as a new measurement. Source/sample/time and daily-rate limitations are visible. Decorative invented sparklines have been removed.
2. News: compare dated official RSS and HTML, deduplicate and sort, protect the latest known publication against older source responses, preserve failure timestamps and previous evidence. Show each source's readable status. Five-minute cache is demand-driven; daily collection remains at 03:00 UTC, not a five-minute unattended job.
3. Developer tools: public account format plus checksum, bounded/cancellable queries, edits clear outdated results, transaction 404 versus 429 versus upstream errors remain separate. Public query source and check times are shown. No transfers, deployments or secret keys.
4. Branding: shared ZAF Tech wordmark in gold/silver, existing star mark, compact Pi actions. See brand-standard.md. Do not claim the generated promotional card is a vector brand master.
5. Listing: use the real portal fields below and verify every declaration against actual behavior. This preparation does not prove eligibility or guarantee approval.

## Actual portal navigation and values

Develop → ZAF Tech (Mainnet) → App Configuration:

- General: ZAF Tech / Pi Ecosystem Observatory; network Mainnet. Existing paired Testnet app is Tekyıldız Protocol (Testnet); do not change pairing without reviewing why it exists.
- Domain: https://zaf-tech.vercel.app ; Self Hosted; ownership verified in supplied screenshot. App Info showed a contradictory Hosted by Pi Core Team label: recheck saved portal state, do not invent a cause.
- Privacy / TOS: https://zaf-tech.vercel.app/privacy and https://zaf-tech.vercel.app/terms . Owner reported Submit completed.
- API Key: no regeneration required; regeneration invalidates earlier keys. Never request secret keys in chat.
- App Wallets: no payments; do not add wallets or payments to satisfy an assumed checklist.
- Pi Sign-In active; callback https://zaf-tech.vercel.app/signin/callback . Official Pi Sign-in documentation explicitly supports ordinary desktop/mobile browsers through either Pi.signIn SDK helper or standard OAuth, with username scope. Our native Pi Browser flow uses Pi.authenticate; desktop uses the documented OAuth flow with state and server identity verification. This confirms technical support, not a guarantee about the portal's SDK-exclusive declaration. No email/social login exists. Public anonymous access is not a different login method.

Develop → ZAF Tech → Ecosystem Listing:

- Intro: at least 400×400, JPG/JPEG/PNG, each below 1 MB. Previews: at least 750×1500, same types and limit, per supplied portal screenshots.
- Refresh screenshots after the final interface release; the previous package predates this strengthening batch. Avoid presenting old metrics as current or unshipped features as available.
- Languages: select only languages actually supported; core interface offers nine, guide and detailed legal supplement are EN/TR. Describe partial translation coverage honestly.
- Category: inspect actual dropdown; do not invent available options.
- Developer Public Name: Zafer TEKYILDIZ (confirmed operator identity).
- Contact Email: zaftech.contact@gmail.com . Version: align with package.json (currently 1.1.0).
- PiOS Compatible: not Apple iOS support. Leave No unless license compliance is reviewed and established.
- Pi Exclusive Transactions: app accepts no payments and has no non-Pi transaction flow; verify wording and don't add paid features to manufacture compliance.
- Pi SDK Exclusive Authentication: disclose the documented Pi OAuth desktop fallback when reviewing this declaration. Do not silently disable working desktop access or assert an official listing exemption. Any ambiguity remains for the final application review.
- KYC: owner explicitly confirmed developer account KYC approved on October 16. This is owner-reported confirmation, not access to identity documents or independent KYC certification. Do not request identity documents here.
- Domain: owner decided tekyildiz.pi will be connected only after remaining work is complete. Keep existing hosted URL and registered callback until then; revisit domain verification and callback registration as one later change.
- External links: source citations are essential to the observatory. Describe their purpose; current guidance evaluates necessary external links case by case. Do not promise automatic compliance or remove evidence citations blindly.

PiNet is a separate later setup. Ads Checklist is for ads; ads remain disabled. Summit participation/showcase is a separate process and has no guaranteed acceptance or listing deadline inferred here.

## Device evidence (owner-reported, not agent-operated)

| Surface | Evidence | Remaining |
|---|---|---|
| iPhone 8 Plus | iOS 16.7.16, Pi Browser 1.17.1; open and username verification succeeded | Cancel/retry/clear-display after final build |
| iPhone 11 | Pi Browser open and username verification succeeded | OS/browser version and remaining flows |
| Desktop Edge and Opera | Owner and spouse Pi accounts succeeded | Browser versions and remaining flows |
| Two Android devices | Brother and friend's Pi Browser open/sign-in succeeded, reported Oct 16 | Device/OS/browser versions and remaining flows |

Do not call viewport emulation a physical-device test. Never record access tokens, secrets or wallet passphrases.

## Operational evidence and unresolved owner/provider work

Public status API checked October 16: storage available; scheduled run October 16 03:55 UTC stored history; status limited because directoryRecords=0, not because the scheduler failed. Timestamp reflects observed execution, not a promise that cron runs at the exact configured minute.

Before declaring legal/operational completion, confirm provider-specific log/backup retention and international transfer arrangements. The app stores public observations and hashed rate-limit windows; no server-side personal session is currently claimed. Publishing notices is not proof of a signed DPA or KVKK Article 9 mechanism. No such contracts or account settings are fabricated or accepted on the owner's behalf. The former high-resolution logo gap is resolved: the owner supplied a 1254×1254 transparent PNG, preserved byte-for-byte. The new Clear username action clears ZAF Tech presentation state only, not the Pi account's global session. Automated cancellation/retry tests supplement rather than replace real-device tests.

Daily Codex check remains paused; existing weekly Sunday 19:00 Istanbul review remains the intended cadence. No additional daily model-usage automation is needed. Keep one reviewed Vercel deployment per batch and automatic Git deployments disabled.

## Sources checked October 16

- https://developers.minepi.com/docs/build-first-app/MainnetListing
- https://developers.minepi.com/docs/build-first-app/PiNet
- https://developers.minepi.com/docs/use-native-features/PiSignIn
- https://minepi.com/blog/introducing-ecosystem-summit/ (Summit announcement; not a listing approval)
