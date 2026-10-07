# ZAF TECH Product Evolution Plan

## Product position

ZAF TECH evolves from a dense ecosystem dashboard into a Pioneer-facing ecosystem intelligence layer.

Core principle:
**Simple at first glance. Deep when you look closer.**

ZAF TECH should help a Pioneer answer four questions quickly:

1. What is happening now?
2. What is moving?
3. What should I discover?
4. What evidence can I actually trust?

## Product surfaces

### ZAF Pulse
The default home surface.

- Live ecosystem state
- Rising signals
- Early signals
- New observations
- Watch items
- Observation confidence
- Compact sparklines instead of unnecessary tables

Pulse is descriptive, not predictive.

### ZAF Discover
The Pioneer discovery layer.

- Existing App Directory becomes the discovery entry point
- Category and search remain
- Future phase: ranked discovery based on observable signals
- Future phase: Pioneer-specific discovery feed

### ZAF Radar
The analytical layer.

- Existing rolling baselines
- Transaction and operation pace
- Success rate
- Ledger throughput
- Public source coverage
- Protocol observation

Future phase:
- ecosystem-level app activity signals
- rising/falling history
- signal explanations
- historical trend views

### ZAF Trust
The evidence layer.

- Observable evidence
- Source coverage
- Observation confidence
- Explicit boundaries
- No ownership/security/financial legitimacy claims without evidence

Future phase:
- project evidence profiles
- domain/source checks
- user-report signals
- provenance and source history

## Visual system

### Information hierarchy

Primary:
- signal
- direction
- significance

Secondary:
- number
- short explanation
- timestamp

Advanced:
- detailed tables
- raw observations
- technical diagnostics

### Graphics

Use graphics only where they communicate change:

- sparklines for movement
- compact trend lines for history
- distribution bars where comparison matters
- graphs for relationships
- no decorative charts

### Color language

Color is semantic, not decorative.

- Gold: ZAF primary / attention
- Green: positive or rising state
- Blue: information / observable source
- Violet: analytical signal
- Neutral: unknown or limited evidence
- Red: genuine risk/error only

Light and dark themes remain.

### Icon language

No conversational emoji or emoji-style UI.

ZAF TECH uses a custom SVG icon language with restrained line geometry, gradients, and semantic color accents.

## Navigation direction

Keep the existing deep technical modules, but make the user-facing hierarchy clearer.

Primary experience:
- Pulse
- Apps / Discover
- Network
- DeFi
- Node & Compute
- Intelligence
- Wallet

Secondary navigation exposes advanced functionality without making the home screen dense.

## Trust and product rules

ZAF TECH must never manufacture FOMO.

Allowed:
- "Observed activity increased"
- "New public observation"
- "Signal is rising against the stored baseline"

Avoid:
- "This will pump"
- "Guaranteed"
- "Everyone is buying"
- artificial countdowns
- unsupported trust/security claims

## Implementation order

### Phase 1 — Product shell
- Pulse home
- Trust surface
- navigation hierarchy
- semantic icon system
- responsive Pulse cards
- sparklines
- preserve existing data engine

### Phase 2 — Discovery
- convert App Directory into Discover
- add signal-aware discovery
- improve app cards
- add "why this is showing" explanations

### Phase 3 — Radar
- ecosystem-level rising signals
- early-signal scoring
- historical signal movement
- signal confidence and provenance

### Phase 4 — Trust
- evidence profiles
- source history
- project/domain checks
- transparent confidence model

### Phase 5 — Pioneer retention
- personalized Pioneer Radar
- daily ecosystem brief
- saved/watch items
- optional notifications
- Pioneer-specific discovery

## Product rule — Coming Soon

ZAF TECH never presents a future capability as active.

- If a feature is fully backed by observable, verifiable data today, it may be active.
- If its infrastructure exists but the required reliable public data is not yet available, the user-facing surface must remain passive and clearly show **Coming Soon**.
- Future ranking, intelligence, historical, Mainnet, personalization, notification, or similar capabilities must not display synthetic, estimated, or placeholder results as if they were live data.
- Existing features that were added before this rule are subject to the same standard and should be audited when touched.
- Backend schemas, adapters, storage, and components may be prepared in advance, but activation is conditional on reliable evidence.

This rule protects the product's core positioning: if ZAF TECH cannot observe it, ZAF TECH does not present it as fact.

## PCT positioning

The long-term product story should be:

**ZAF TECH is an independent, read-only ecosystem intelligence layer that helps Pioneers discover, understand, and evaluate observable activity across the Pi ecosystem.**

It should complement the Pi ecosystem rather than present itself as an official Pi Core Team product.


## Product rule — Activation Contract

**Coming Soon is not a wish list.**

A future capability may be shown in the product only when there is a credible, testable path to activating it.

Before adding a future feature, ZAF TECH must answer:

1. **Data** — What exact data does the feature require?
2. **Source** — Which public or otherwise authorized source can provide that data?
3. **Access** — Can ZAF TECH actually access that source reliably?
4. **Validation** — Can the returned data be independently checked for correctness and freshness?
5. **Activation** — What concrete condition will allow the feature to become active?

Classification:

- **ACTIVE** — The required evidence is observable and verifiable now.
- **COMING SOON** — The capability is not active yet, but a concrete activation path exists and the missing dependency is realistically obtainable.
- **BLOCKED / NOT PLANNED** — There is no reliable activation path, the required evidence cannot be observed, or the feature would require unsupported inference. It must not be exposed as a product capability.

A feature must not be placed in **Coming Soon** merely because it would be useful, technically interesting, or desirable.

Backend schemas, adapters, experiments, and internal prototypes may exist without being exposed to users. User-facing activation is conditional on reliable evidence.

**Rule of inclusion:**

> If ZAF TECH cannot identify a realistic activation path, ZAF TECH does not add the feature to the product.

This rule applies retrospectively to existing features and prospectively to every new feature proposal.
