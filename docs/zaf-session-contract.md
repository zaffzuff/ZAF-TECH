# ZAF TECH — ZAF Session Contract for Pi Integration

## Status

Architecture contract only. No authentication is enabled by this document.

## Principle

Pi authentication proves a Pi identity. It does not become the ZAF application's session mechanism.

ZAF must create and manage its own authenticated application session after successful server-side Pi verification.

## Separation

### Pi credential

- Issued by the Pi platform.
- Sensitive.
- Accepted only by the server-side Pi verification boundary.
- Never persisted in browser localStorage.
- Never used as a ZAF session cookie.
- Never returned to ordinary UI state.

### Verified Pi identity

The server may derive a minimal identity representation such as:

- Pi UID
- Pi username, when available
- environment/network
- verification timestamp

Only verified values are trusted.

### ZAF session

The application session is independent of the Pi credential.

The eventual session should:

- be server-controlled;
- have an explicit expiration;
- be revocable;
- carry only the minimum ZAF identity/authorization data;
- be delivered using secure browser session mechanics;
- never contain the raw Pi access token.

## Initial authorization model

The first Pi integration should use the smallest useful authorization surface.

Authentication does not automatically grant:

- wallet signing;
- payment authority;
- administrative access;
- write access to ZAF data;
- access to the local Node Connector.

Those capabilities require separate, explicit boundaries.

## Public observatory rule

Unauthenticated users must continue to access the existing read-only ZAF TECH observatory.

Pi authentication is an additive capability, not a prerequisite for public observations.

## Failure isolation

A Pi authentication outage, invalid credential, or unavailable Pi verification service must not take down the public observatory.

Authentication failures must remain isolated to authenticated features.

## Implementation gate

Before implementing the first real Pi authentication endpoint, verify:

1. The exact Pi testnet authentication contract from current official documentation.
2. The exact SDK version and loading requirements.
3. The exact server-side verification endpoint and credential semantics.
4. The required Pi environment configuration.
5. Session cookie/security requirements for the chosen Next.js deployment.
6. Logout, expiration, replay, and verification-failure behavior.

No payment implementation begins until authentication and session behavior are verified independently.
