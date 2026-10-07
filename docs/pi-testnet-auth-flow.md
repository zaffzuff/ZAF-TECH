# ZAF TECH — Pi Testnet Authentication Flow

## Scope

This document defines the testnet authentication contract before the Pi SDK is enabled. It is architecture only; it does not activate Pi authentication.

## Trust boundaries

```
Pi Browser / Pi SDK
        |
        | Pi authentication result
        v
PiService (client boundary)
        |
        | credential stays inside Pi integration boundary
        v
ZAF API / Pi verification
        |
        | verified Pi identity
        v
ZAF application session
```

## Required flow

1. The client loads the Pi SDK only through the Pi integration boundary.
2. The client requests the minimum required Pi scopes.
3. The SDK returns Pi authentication material.
4. The Pi boundary sends the credential to a ZAF server endpoint over HTTPS.
5. The ZAF server verifies the credential against Pi's server-side API.
6. ZAF derives the verified Pi UID/username from the server verification result.
7. ZAF creates its own application session.
8. The browser receives only the ZAF session representation required by the application.
9. The Pi access token is not used as the ZAF session and is not stored in localStorage.
10. Logout clears the ZAF session and any client-side Pi integration state.

## Fail-closed requirements

- Missing Pi server configuration => authentication disabled/fails closed.
- Invalid Pi credential => 401.
- Pi verification failure => 502/503 according to failure class; do not trust client-supplied identity.
- Mismatched UID/username from client versus verified Pi response => reject.
- Testnet/mainnet mismatch => reject.
- Expired/invalid ZAF session => unauthenticated.
- Pi authentication failure must not disable the public read-only observatory.

## Environment separation

Testnet and mainnet configuration must be explicit deployment configuration.

No request parameter, browser storage value, URL query parameter, or client-provided field may select the Pi network.

## Not part of this step

- Pi SDK loading
- Real Pi authentication calls
- Pi server API calls
- Database-backed ZAF sessions
- Pi payments

Those are separate implementation and verification steps.
