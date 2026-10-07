# ZAF TECH Feature Readiness

This document is the release gate for future-facing ZAF TECH capabilities.

## State model

| State | Meaning | User-facing behavior |
| --- | --- | --- |
| ACTIVE | Required evidence is observable and verifiable now. | Feature may operate normally. |
| COMING SOON | Feature is not active yet, but a concrete activation path exists. | Show a clear Coming Soon state; do not show synthetic results. |
| BLOCKED | No reliable activation path currently exists. | Do not expose the feature as a product capability. |
| NOT PLANNED | Outside the supported product scope. | Do not build or expose it. |

## Activation contract

Every future feature must have all of the following before it is exposed as Coming Soon:

- **Data:** exact required fields and measurements are defined.
- **Source:** a reliable source is identified.
- **Access:** ZAF TECH can actually access the source under its allowed operating model.
- **Validation:** correctness, freshness, and network scope can be checked.
- **Activation trigger:** a concrete condition for enabling the feature is defined.

If any required item has no realistic solution, the feature is BLOCKED and should not be added to the product UI.

## Evidence rules

- Do not use estimated, synthetic, placeholder, or fabricated values as live observations.
- Do not turn a published announcement into a live operational claim.
- Do not infer ownership, legitimacy, security, user intent, popularity, or financial outcomes without observable evidence.
- Do not create rankings unless the ranking inputs are observable, reproducible, and explainable.
- Do not label a feature active merely because its frontend or backend code exists.
- Historical features require actual persisted observations; a schema alone is not historical evidence.
- Mainnet features require Mainnet evidence; Testnet evidence does not activate a Mainnet feature.
- A feature that depends on private, inaccessible, or non-verifiable data is not an activation candidate.

## Review template

Use this checklist for every future feature proposal:

### Feature
- Name:
- Proposed state:
- User-facing purpose:

### Activation contract
- Data:
- Source:
- Access:
- Validation:
- Activation trigger:

### Evidence boundary
- Network scope:
- Observation timestamp:
- Freshness requirement:
- Known limitations:

### Decision
- [ ] ACTIVE
- [ ] COMING SOON
- [ ] BLOCKED
- [ ] NOT PLANNED

### Release gate
- [ ] No synthetic or placeholder live results
- [ ] Source is documented
- [ ] Evidence can be reproduced
- [ ] Scope is explicit
- [ ] Failure/unknown states are represented
- [ ] Activation condition is testable

## Current direction

The existing product should continue to prioritize capabilities that already have observable evidence, including public Mainnet observations, public ecosystem source observations, URL/infrastructure checks, published Testnet evidence, and the node/host telemetry that ZAF TECH can actually access.

Future intelligence may be prepared internally, but it must remain inactive until its evidence contract is satisfied.
