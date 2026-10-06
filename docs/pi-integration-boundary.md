# ZAF TECH — Pi Integration Boundary

## Purpose

This boundary isolates future Pi SDK, authentication, session, and payment integration from the existing read-only ZAF TECH observatory.

The current foundation remains Pi-independent.

## Current state

- Pi SDK is not loaded.
- No `window.Pi` calls exist in the application.
- Pi authentication is disabled.
- Pi payments are disabled.
- `NEXT_PUBLIC_PI_ENVIRONMENT` may describe the intended future environment, but the feature flag remains disabled.
- The public ZAF TECH observatory must continue to work without Pi authentication.

## Rules before enabling Pi

1. Pi SDK loading must be isolated behind the Pi service boundary.
2. UI components must not call `window.Pi` directly.
3. Pi access tokens must never be treated as ZAF application sessions.
4. The backend must verify Pi identity server-side before trusting authenticated user data.
5. Any Pi server API key must remain server-only.
6. Payment approval and completion must be server-side operations.
7. Incomplete and cancelled payments must have explicit states.
8. Testnet and mainnet configuration must be explicit and must not be switched implicitly at runtime.
9. Existing read-only observatory endpoints must remain usable without Pi authentication.
10. Enabling Pi must be a deliberate release boundary, followed by testnet verification before any mainnet activation.

## Intended future structure

- `lib/pi/types.ts` — shared Pi boundary types.
- `lib/pi/pi-config.ts` — environment and feature configuration.
- `lib/pi/pi-service.ts` — single application-facing Pi service.
- Future authentication/session/payment modules must depend on this boundary rather than exposing SDK calls throughout the UI.

## Foundation freeze invariant

Adding Pi must not require rewriting the existing ZAF TECH observatory architecture. The integration is an additional capability layered at the boundary.
