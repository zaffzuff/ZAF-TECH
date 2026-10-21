# Five-wallet Testnet A2U test

The separate `/a2u` page requests explicit username + wallet-address sharing.
Normal sign-in remains username-only. The server verifies the fresh Pi token,
uses the official Pi app UID to create an A2U payment, and checks Pi's returned
recipient against the private allowlist. A manually entered address or transfer
from the Wallet app is not substituted for this flow.

## Fixed limits

- Pi Testnet only, fixed Horizon endpoint and `Pi Testnet` signing passphrase.
- 0.01 Test-Pi per claim; at most five claimed recipient wallets (0.05 Test-Pi
  in payments, plus Testnet network fees and the source account's reserve).
- One claim per verified app identity and per recipient wallet.
- The server never accepts an amount, destination, UID or envelope from callers.
- No Mainnet payment is signed. All secrets stay server-side.

## Required production settings in the zaf-tech-testnet Vercel project

1. `PI_NETWORK=testnet` (already configured for the Testnet app).
2. `PI_TESTNET_API_KEY`: server API key from **ZAF Tech Testnet** in Develop.
3. `PI_TESTNET_WALLET_SECRET`: secret seed (S...) of that application's outgoing
   **app wallet**, not a user's wallet password or 24-word phrase.
4. `PI_TESTNET_DATABASE_URL`: direct PostgreSQL connection to a separate Testnet
   record store. Do not use a PgBouncer/transaction-pooler URL: session advisory
   locks must remain on the same PostgreSQL backend. For Neon use its direct
   unpooled URL, not a hostname containing `-pooler`.
5. `PI_TESTNET_A2U_WALLETS`: one to five comma-separated public recipient G...
   addresses. Each recipient must have an active Testnet account.
6. `PI_TESTNET_A2U_ENABLED=true` only after setup and read-only preflight pass.

Keep the existing `ZAF_PI_SESSION_SECRET` independent from Mainnet. Set API key,
wallet seed and database URL as **Secret**, for **Production** in this Testnet
project. Never paste them into chat, source files, screenshots or browser code.
Redeploy the Testnet project after changing settings. Do not configure any of
these in the Mainnet project.

Use `node --env-file=.env.local tools/zaf-a2u-preflight.mjs` in an authorized
local environment for read-only checks. The preflight never sends a payment.
An API key accepted by the API with no pending payments does not prove which
app network it belongs to; the owner must select the Testnet application's key.
Every actual payment is checked for `network === "Pi Testnet"` before signing.

## Participant steps

1. Open `https://zaf-tech-testnet.vercel.app/a2u` in Pi Browser.
2. Tap the receive button and approve username + wallet-address sharing.
3. Wait for the completed receipt (payment ID + Testnet transaction hash).
4. Verify receipt in the user's Testnet wallet. Repeat with five distinct users
   whose active wallet addresses match the allowlist.

Use the **same Developer Portal Testnet app** paired to the intended Mainnet
app. This API key must belong to the record from which users sign in. A different
app's UID or wallet will not be silently substituted. Portal eligibility must
still be checked after the real transfers; an application receipt alone is not
proof that the Portal has updated its eligibility counter.

## Recovery and operations

The record table is initialized by the application in the separate configured
database. A cross-instance session advisory lock serializes payments. State is
committed before external calls, including the exact signed envelope and hash
before chain submission. Retries reuse those bytes/hash; completion retries do
not send another payment. Chain source, destination, native amount, memo and
success are checked, followed by Pi `transaction_verified`, transaction
`verified` and `developer_completed` before the page reports success.

After an ambiguous create response, only a matching incomplete Pi payment can
resume the claim. An unmatched/unknown payment, expired unconfirmed envelope,
changed recipient, wrong network/source or lost database lock stops the flow
for review. Other users may be blocked until the interrupted claim is resolved.
Do not delete/reset records, clear a claim, regenerate an envelope or reset the
campaign while the feature is active: that can defeat duplicate prevention.
Do not cancel unrelated payments. Disable the feature after five receipts.

No real transfer, live database migration or Portal-counter increment is proven
by mock tests. Finish database and credential setup, then verify one real
Testnet receipt before inviting the other four participants.

## Records

Stored: hash of app UID, recipient address, payment ID, signed Testnet envelope,
transaction hash, status and timestamps. Not stored: raw UID, Pi access token,
user wallet secret or API key. Keep records while the campaign can be resumed;
close the feature before performing any requested record deletion. On-chain
records remain public. The privacy/about/terms pages include a Testnet exception
notice so the read-only observatory description is not mistaken for the test's
behavior.
