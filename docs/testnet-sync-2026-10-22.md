# Testnet synchronization

The Testnet branch incorporates the deployed Mainnet release at
`84b34a061e7ce6f27f1010cc60aa4fb0a49ffc39` while retaining its domain validation
file, Testnet title/badge, and isolated `/sandbox` route.

## Pi configuration

- Vercel project: `zaf-tech-testnet`; production branch: `testnet`.
- Hosted URL: `https://zaf-tech-testnet.vercel.app`.
- Development URL for the Developer Portal Sandbox:
  `https://zaf-tech-testnet.vercel.app/sandbox`.
- `PI_NETWORK=testnet`, `PI_SDK_MODE=hosted`. Only `/sandbox` enables the Sandbox SDK.
- The project needs its own `ZAF_PI_SESSION_SECRET` (64 random hexadecimal characters).
- Keep the existing Testnet OAuth client ID. Do not copy Mainnet credentials.
- Native Testnet SDK tokens are verified at the official Pi Platform `/v2/me`
  endpoint, rather than at the distinct Mainnet App Studio backend.
- Authentication remains username-only. No payment scope, transfer API, or wallet
  key was added by this synchronization.

## Validation and limits

TypeScript, ESLint, regression checks, 55 readiness tests, 104 final flow tests,
official-news tests, update tests, production build, and local smoke checks pass.
Browser and live endpoint results must be recorded separately after deployment.
Physical-device consent and genuine A2U transactions are not covered by unit tests.
The Portal's five-recipient requirement must be met by application-originated
Testnet A2U transactions; manual wallet transfers are not proven equivalent.
